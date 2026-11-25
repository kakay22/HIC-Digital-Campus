from django.contrib.auth import get_user_model
from django.db.models import Avg, Count

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from evaluation.models import (
    EducationLevel,
    Teacher,
    Student,
    Course,
    EducationLevel,
    EvaluationPeriod,
    TeacherEvaluation,
    SectionEvaluation,
)

User = get_user_model()

User = get_user_model()


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        login_value = attrs.get(self.username_field)

        # Allow login using either username or email.
        if login_value and "@" in str(login_value):
            matching_users = User.objects.filter(
                email__iexact=login_value
            )

            if matching_users.count() == 1:
                attrs[self.username_field] = (
                    matching_users.first().get_username()
                )

        data = super().validate(attrs)

        # Only staff/superuser accounts may access the admin application.
        if not (self.user.is_staff or self.user.is_superuser):
            raise serializers.ValidationError(
                "You do not have permission to access the administrator portal."
            )

        data["user"] = {
            "id": self.user.id,
            "username": self.user.get_username(),
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "full_name": self.user.get_full_name(),
            "is_staff": self.user.is_staff,
            "is_superuser": self.user.is_superuser,
        }

        return data


class AdminProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_staff",
            "is_superuser",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.get_username()

from django.contrib.auth.password_validation import validate_password


class AdminProfileUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
        ]

    def validate_email(self, value):
        value = value.strip()

        duplicates = User.objects.filter(email__iexact=value)

        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                "This email address is already being used."
            )

        return value

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get(
            "first_name", instance.first_name
        ).strip()

        instance.last_name = validated_data.get(
            "last_name", instance.last_name
        ).strip()

        instance.email = validated_data.get(
            "email", instance.email
        ).strip()

        instance.save(
            update_fields=["first_name", "last_name", "email"]
        )

        return instance


class AdminPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "The new passwords do not match."
            })

        user = self.context["request"].user

        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "new_password": list(exc.messages)
            })

        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError({
                "new_password": (
                    "Your new password must be different "
                    "from your current password."
                )
            })

        return attrs

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "The new passwords do not match."
            })

        user = self.context["request"].user

        validate_password(attrs["new_password"], user=user)

        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError({
                "new_password": "Your new password must be different from your current password."
            })

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            self.token = RefreshToken(attrs["refresh"])

            request = self.context.get("request")

            # A user can only revoke their own refresh token.
            if (
                request
                and str(self.token["user_id"]) != str(request.user.pk)
            ):
                raise serializers.ValidationError({
                    "refresh": "You cannot revoke another user's token."
                })

        except TokenError:
            raise serializers.ValidationError({
                "refresh": "Invalid or expired refresh token."
            })

        return attrs

    def save(self, **kwargs):
        self.token.blacklist()

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "name", "code"]


class TeacherSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    courses = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Course.objects.all(),
        required=False,
    )

    course_details = CourseSerializer(
        source="courses",
        many=True,
        read_only=True,
    )

    evaluation_count = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "specialization",
            "education_level",
            "courses",
            "course_details",
            "is_archived",
            "evaluation_count",
        ]
        read_only_fields = [
            "id",
            "full_name",
            "course_details",
            "is_archived",
            "evaluation_count",
        ]

    def get_evaluation_count(self, obj):
        return obj.evaluations.count()

    def validate(self, attrs):
        education_level = attrs.get(
            "education_level",
            getattr(self.instance, "education_level", EducationLevel.COLLEGE),
        )

        courses = attrs.get("courses")

        if education_level == EducationLevel.BASIC and courses:
            raise serializers.ValidationError({
                "courses": "Basic Education teachers cannot be assigned college courses."
            })

        return attrs

class TeacherSectionHistorySerializer(serializers.ModelSerializer):
    prefix = serializers.CharField(source="section.prefix", read_only=True)
    title = serializers.CharField(source="section.title", read_only=True)

    class Meta:
        model = SectionEvaluation
        fields = [
            "id",
            "prefix",
            "title",
            "average_rating",
            "total_score",
        ]


class TeacherEvaluationHistorySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(
        source="subject.name",
        read_only=True,
    )

    course_name = serializers.CharField(
        source="course.name",
        read_only=True,
        allow_null=True,
    )

    section_scores = TeacherSectionHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = TeacherEvaluation
        fields = [
            "id",
            "student_id",
            "student_name",
            "subject_name",
            "course_name",
            "semester",
            "academic_year",
            "year_level",
            "submitted_at",
            "overall_rating",
            "commendable_features",
            "suggestions_improvement",
            "section_scores",
        ]


class TeacherProfileSerializer(TeacherSerializer):
    evaluation_history = serializers.SerializerMethodField()

    class Meta(TeacherSerializer.Meta):
        fields = TeacherSerializer.Meta.fields + [
            "evaluation_history",
        ]

    def get_evaluation_history(self, teacher):
        evaluations = (
            teacher.evaluations
            .select_related("subject", "course")
            .prefetch_related(
                "section_scores__section",
            )
            .order_by("-submitted_at", "-pk")
        )

        return TeacherEvaluationHistorySerializer(
            evaluations,
            many=True,
        ).data

from django.db.models import Avg, Count
from evaluation.models import (
    Teacher,
    Course,
    EvaluationPeriod,
    TeacherEvaluation,
    SectionEvaluation,
)


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "name", "code"]


class TeacherSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    courses = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Course.objects.all(),
        required=False,
    )

    course_details = CourseSerializer(
        source="courses",
        many=True,
        read_only=True,
    )

    evaluation_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    section_insights = serializers.SerializerMethodField()
    current_period = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "specialization",
            "education_level",
            "courses",
            "course_details",
            "is_archived",
            "evaluation_count",
            "average_rating",
            "section_insights",
            "current_period",
        ]
        read_only_fields = [
            "id",
            "full_name",
            "is_archived",
            "evaluation_count",
            "average_rating",
            "section_insights",
            "current_period",
        ]

    def validate(self, attrs):
        education_level = attrs.get(
            "education_level",
            getattr(self.instance, "education_level", EducationLevel.COLLEGE),
        )

        courses = attrs.get("courses")

        if education_level == EducationLevel.BASIC and courses:
            raise serializers.ValidationError({
                "courses": (
                    "Basic Education teachers cannot be assigned "
                    "College courses."
                )
            })

        return attrs

    def _get_current_period(self, teacher):
        return (
            EvaluationPeriod.objects
            .filter(
                education_level=teacher.education_level,
                is_open=True,
            )
            .order_by("-start_date", "-pk")
            .first()
        )

    def _get_current_evaluations(self, teacher):
        period = self._get_current_period(teacher)

        if not period:
            return TeacherEvaluation.objects.none()

        return TeacherEvaluation.objects.filter(
            teacher=teacher,
            education_level=period.education_level,
            academic_year=period.academic_year,
            semester=period.semester,
        )

    def get_current_period(self, teacher):
        period = self._get_current_period(teacher)

        if not period:
            return None

        return {
            "id": period.id,
            "education_level": period.education_level,
            "academic_year": period.academic_year,
            "semester": period.semester,
            "start_date": period.start_date,
            "end_date": period.end_date,
        }

    def get_evaluation_count(self, teacher):
        return self._get_current_evaluations(teacher).count()

    def get_average_rating(self, teacher):
        evaluations = self._get_current_evaluations(teacher)

        per_evaluation = (
            SectionEvaluation.objects
            .filter(evaluation__in=evaluations)
            .values("evaluation_id")
            .annotate(evaluation_average=Avg("average_rating"))
        )

        values = [
            row["evaluation_average"]
            for row in per_evaluation
            if row["evaluation_average"] is not None
        ]

        if not values:
            return None

        return round(sum(values) / len(values), 2)

    def get_section_insights(self, teacher):
        evaluations = self._get_current_evaluations(teacher)

        insights = (
            SectionEvaluation.objects
            .filter(evaluation__in=evaluations)
            .values(
                "section_id",
                "section__prefix",
                "section__title",
            )
            .annotate(
                average_rating=Avg("average_rating"),
                evaluation_count=Count("evaluation_id"),
            )
            .order_by("section__prefix")
        )

        return [
            {
                "section_id": item["section_id"],
                "prefix": item["section__prefix"],
                "title": item["section__title"],
                "average_rating": (
                    round(item["average_rating"], 2)
                    if item["average_rating"] is not None
                    else None
                ),
                "evaluation_count": item["evaluation_count"],
            }
            for item in insights
        ]

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["id", "student_id", "education_level", "is_archived"]
        read_only_fields = ["id", "is_archived"]

    def validate_student_id(self, value):
        value = value.strip()

        # The evaluation form checks IDs without case sensitivity,
        # so "abc1" and "ABC1" must not both be registered.
        duplicates = Student.objects.filter(student_id__iexact=value)

        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                "This student ID is already registered."
            )

        return value

import re


class EvaluationPeriodSerializer(serializers.ModelSerializer):
    education_level_display = serializers.CharField(
        source="get_education_level_display", read_only=True
    )
    semester_display = serializers.CharField(
        source="get_semester_display", read_only=True
    )

    class Meta:
        model = EvaluationPeriod
        fields = [
            "id",
            "education_level",
            "education_level_display",
            "academic_year",
            "semester",
            "semester_display",
            "start_date",
            "end_date",
            "is_open",
        ]
        # Uniqueness is checked in validate() so the error message is readable.
        validators = []

    def validate_academic_year(self, value):
        value = value.strip()
        match = re.fullmatch(r"(\d{4})-(\d{4})", value)

        if not match or int(match.group(2)) != int(match.group(1)) + 1:
            raise serializers.ValidationError(
                "Use the format 2026-2027 (two consecutive years)."
            )

        return value

    def validate(self, attrs):
        instance = self.instance

        def current(field):
            return attrs.get(field, getattr(instance, field, None))

        start_date = current("start_date")
        end_date = current("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "The end date cannot be before the start date."}
            )

        duplicates = EvaluationPeriod.objects.filter(
            education_level=current("education_level"),
            academic_year=current("academic_year"),
            semester=current("semester"),
        )

        if instance:
            duplicates = duplicates.exclude(pk=instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                "This division already has a period for that academic year and semester."
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        if validated_data.get("is_open"):
            EvaluationPeriod.objects.filter(
                education_level=validated_data["education_level"],
                is_open=True,
            ).update(is_open=False)

        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        if validated_data.get("is_open"):
            level = validated_data.get("education_level", instance.education_level)

            EvaluationPeriod.objects.filter(
                education_level=level,
                is_open=True,
            ).exclude(pk=instance.pk).update(is_open=False)

        return super().update(instance, validated_data)