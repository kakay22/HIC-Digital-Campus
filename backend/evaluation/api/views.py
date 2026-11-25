
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count, Avg, FloatField
from django.db.models.functions import TruncMonth, Cast
from datetime import date
from django.shortcuts import get_object_or_404
from django.db.models import Max
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework import permissions


from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


from django.utils import timezone

from rest_framework.permissions import AllowAny

from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from evaluation.models import (
    EducationLevel,
    Teacher,
    EvaluationPeriod,
    Course,
    Section,
    Subject,
    Student,
    Question,
    TeacherEvaluation,
    EvaluationItem,
    SectionEvaluation,
    Suggestion,
)

from .serializers import (
    AdminTokenObtainPairSerializer,
    AdminProfileSerializer,
    AdminProfileUpdateSerializer,
    AdminPasswordChangeSerializer,
    LogoutSerializer,
    TeacherSerializer,
    TeacherProfileSerializer,
    CourseSerializer,
    StudentSerializer,
    EvaluationPeriodSerializer,
)


class IsAdminAccount(permissions.BasePermission):
    """
    Allow only authenticated Django staff or superuser accounts.
    """

    def has_permission(self, request, view):
        user = request.user

        return (
            bool(user and user.is_authenticated)
            and (user.is_staff or user.is_superuser)
        )


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class AdminTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class AdminProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/auth/me/
    PATCH /api/auth/me/

    Retrieves and updates the authenticated administrator's profile.
    """

    permission_classes = [IsAdminAccount]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AdminProfileUpdateSerializer

        return AdminProfileSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return the complete profile, not just the updated fields.
        return Response(
            AdminProfileSerializer(instance).data,
            status=status.HTTP_200_OK,
        )

class AdminPasswordChangeView(APIView):
    """
    POST /api/auth/change-password/

    Changes the authenticated administrator's password.
    """

    permission_classes = [IsAdminAccount]

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": "Your password has been changed successfully."
            },
            status=status.HTTP_200_OK,
        )

class AdminLogoutView(APIView):
    permission_classes = [IsAdminAccount]

    def post(self, request):
        serializer = LogoutSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )


# =========================================================
# ADMIN TEACHER MANAGEMENT
# =========================================================

class AdminTeacherListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/teachers/
    POST /api/admin/teachers/

    Lists and creates teachers.
    Supports filtering by education level and searching by name.
    """

    serializer_class = TeacherSerializer
    permission_classes = [IsAdminAccount]

    def get_queryset(self):
        queryset = Teacher.objects.prefetch_related("courses")

        # Hide archived teachers by default.
        include_archived = (
            self.request.query_params
            .get("include_archived", "")
            .lower() in ["1", "true", "yes"]
        )

        if not include_archived:
            queryset = queryset.filter(is_archived=False)

        # Filter by education level.
        education_level = self.request.query_params.get("education_level")

        if education_level in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            queryset = queryset.filter(
                education_level=education_level
            )

        # Search by first name, last name, or specialization.
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(specialization__icontains=search)
            )

        return queryset.order_by("last_name", "first_name")


class AdminTeacherDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/teachers/<id>/
    PUT   /api/admin/teachers/<id>/
    PATCH /api/admin/teachers/<id>/
    """

    queryset = (
        Teacher.objects
        .prefetch_related(
            "courses",
            "evaluations__subject",
            "evaluations__course",
            "evaluations__section_scores__section",
        )
    )

    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAdminAccount]


class AdminTeacherArchiveView(APIView):
    """
    POST /api/admin/teachers/<id>/archive/

    Archives a teacher without deleting historical evaluations.
    """

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        teacher = get_object_or_404(Teacher, pk=pk)

        if teacher.is_archived:
            return Response(
                {"detail": "This teacher is already archived."},
                status=status.HTTP_200_OK,
            )

        teacher.is_archived = True
        teacher.save(update_fields=["is_archived"])

        return Response(
            {
                "detail": "Teacher archived successfully.",
                "teacher_id": teacher.id,
                "is_archived": teacher.is_archived,
            },
            status=status.HTTP_200_OK,
        )

# =========================================================
# ADMIN STUDENT MANAGEMENT
# =========================================================

class StudentEvaluationCountMixin:
    """Adds evaluation counts per student ID to the serializer context."""

    def get_serializer_context(self):
        context = super().get_serializer_context()

        rows = (
            TeacherEvaluation.objects
            .values("student_id")
            .annotate(total=Count("id"))
        )

        context["evaluation_counts"] = {
            row["student_id"].lower(): row["total"] for row in rows
        }

        return context


# =========================================================
# ADMIN STUDENT ID MANAGEMENT
# =========================================================

class AdminStudentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/students/
    POST /api/admin/students/
    """

    serializer_class = StudentSerializer
    permission_classes = [IsAdminAccount]

    def get_queryset(self):
        queryset = Student.objects.all()
        params = self.request.query_params

        include_archived = params.get("include_archived", "").lower() in [
            "1", "true", "yes",
        ]

        if not include_archived:
            queryset = queryset.filter(is_archived=False)

        education_level = params.get("education_level")

        if education_level in [EducationLevel.COLLEGE, EducationLevel.BASIC]:
            queryset = queryset.filter(education_level=education_level)

        search = params.get("search", "").strip()

        if search:
            queryset = queryset.filter(student_id__icontains=search)

        return queryset.order_by("student_id")


class AdminStudentBulkCreateView(APIView):
    """
    POST /api/admin/students/bulk/

    Body: { "student_ids": ["2024-0123", ...], "education_level": "COLLEGE" }
    Registers every new ID and skips IDs that already exist.
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        education_level = str(
            request.data.get("education_level", EducationLevel.COLLEGE)
        ).upper()

        if education_level not in [EducationLevel.COLLEGE, EducationLevel.BASIC]:
            return Response(
                {"detail": "Invalid education division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_ids = request.data.get("student_ids")

        if not isinstance(raw_ids, list) or not raw_ids:
            return Response(
                {"detail": "Provide a list of student IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clean the list and remove duplicates (ignoring letter case).
        unique_ids = {}

        for value in raw_ids:
            cleaned = str(value).strip()

            if cleaned:
                unique_ids.setdefault(cleaned.lower(), cleaned)

        student_ids = list(unique_ids.values())

        too_long = [sid for sid in student_ids if len(sid) > 10]

        if too_long:
            return Response(
                {
                    "detail": (
                        "Student IDs cannot exceed 10 characters: "
                        + ", ".join(too_long[:5])
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = {
            sid.lower()
            for sid in Student.objects.values_list("student_id", flat=True)
        }

        new_students = [
            Student(student_id=sid, education_level=education_level)
            for sid in student_ids
            if sid.lower() not in existing
        ]

        Student.objects.bulk_create(new_students)

        return Response(
            {
                "created": len(new_students),
                "skipped": len(student_ids) - len(new_students),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminStudentDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/students/<id>/
    PATCH /api/admin/students/<id>/
    """

    serializer_class = StudentSerializer
    permission_classes = [IsAdminAccount]
    queryset = Student.objects.all()


class AdminStudentArchiveView(APIView):
    """POST /api/admin/students/<id>/archive/"""

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        student = get_object_or_404(Student, pk=pk)

        student.is_archived = True
        student.save(update_fields=["is_archived"])

        return Response(
            {"detail": "Student ID archived.", "is_archived": True},
            status=status.HTTP_200_OK,
        )


class AdminStudentRestoreView(APIView):
    """POST /api/admin/students/<id>/restore/"""

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        student = get_object_or_404(Student, pk=pk)

        student.is_archived = False
        student.save(update_fields=["is_archived"])

        return Response(
            {"detail": "Student ID restored.", "is_archived": False},
            status=status.HTTP_200_OK,
        )

class AdminStudentDetailView(StudentEvaluationCountMixin, generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/students/<id>/
    PATCH /api/admin/students/<id>/
    """

    serializer_class = StudentSerializer
    permission_classes = [IsAdminAccount]
    queryset = Student.objects.all()


class AdminStudentArchiveView(APIView):
    """
    POST /api/admin/students/<id>/archive/

    Archives a student without deleting their evaluation history.
    """

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        student = get_object_or_404(Student, pk=pk)

        student.is_archived = True
        student.save(update_fields=["is_archived"])

        return Response(
            {
                "detail": "Student archived successfully.",
                "student_id": student.id,
                "is_archived": student.is_archived,
            },
            status=status.HTTP_200_OK,
        )

class AdminCourseListView(generics.ListAPIView):
    """
    GET /api/admin/courses/

    Returns available courses for teacher assignment.
    """

    queryset = Course.objects.all().order_by("name")
    serializer_class = CourseSerializer
    permission_classes = [IsAdminAccount]


class AdminDashboardSummaryView(APIView):
    """
    GET /api/admin/dashboard/summary/

    Returns database-backed statistics for the admin dashboard.
    """
    permission_classes = [IsAdminAccount]

    def get(self, request):
        today = timezone.localdate()

        # ----------------------------------------
        # 1. Overall statistics
        # ----------------------------------------
        total_teachers = Teacher.objects.filter(
            is_archived=False
        ).count()

        total_evaluations = TeacherEvaluation.objects.count()
        total_students = Student.objects.count()
        total_subjects = Subject.objects.count()

        # ----------------------------------------
        # 2. Monthly evaluation activity
        # Last 6 months, including the current month
        # ----------------------------------------
        current_month_index = today.year * 12 + today.month - 1

        months = []

        for offset in range(5, -1, -1):
            month_index = current_month_index - offset
            year = month_index // 12
            month = month_index % 12 + 1

            months.append({
                "key": f"{year}-{month:02d}",
                "label": date(year, month, 1).strftime("%b %Y"),
            })

        start_month = months[0]["key"]

        monthly_results = (
            TeacherEvaluation.objects
            .annotate(month=TruncMonth("submitted_at"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )

        monthly_lookup = {
            item["month"].strftime("%Y-%m"): item["total"]
            for item in monthly_results
            if item["month"]
        }

        evaluation_activity = [
            {
                "month": item["label"],
                "total": monthly_lookup.get(item["key"], 0),
            }
            for item in months
        ]

        # ----------------------------------------
        # 3. Division summaries and active periods
        # ----------------------------------------
        def get_division_summary(division):
            active_period = EvaluationPeriod.objects.filter(
                education_level=division,
                is_open=True,
                start_date__lte=today,
                end_date__gte=today,
            ).first()

            return {
                "teachers": Teacher.objects.filter(
                    education_level=division,
                    is_archived=False,
                ).count(),

                "evaluations": TeacherEvaluation.objects.filter(
                    education_level=division,
                ).count(),

                "active_period": (
                    {
                        "id": active_period.id,
                        "academic_year": active_period.academic_year,
                        "semester": active_period.semester,
                        "start_date": active_period.start_date,
                        "end_date": active_period.end_date,
                    }
                    if active_period
                    else None
                ),
            }

        division_summary = {
            "college": get_division_summary(EducationLevel.COLLEGE),
            "basic": get_division_summary(EducationLevel.BASIC),
        }

        # ----------------------------------------
        # 4. Recent evaluations
        # ----------------------------------------
        recent_evaluations = (
            TeacherEvaluation.objects
            .select_related("teacher")
            .order_by("-submitted_at", "-pk")[:5]
        )

        recent_activity = [
            {
                "id": evaluation.id,
                "teacher": evaluation.teacher.full_name,
                "division": evaluation.education_level,
                "submitted_at": evaluation.submitted_at,
                "overall_rating": evaluation.overall_rating,
            }
            for evaluation in recent_evaluations
        ]

        # ----------------------------------------
        # 5. Response
        # ----------------------------------------
        return Response({
            "statistics": {
                "total_teachers": total_teachers,
                "total_evaluations": total_evaluations,
                "total_students": total_students,
                "total_subjects": total_subjects,
            },
            "evaluation_activity": evaluation_activity,
            "division_summary": division_summary,
            "recent_activity": recent_activity,
        })


class AdminEvaluationResultsView(APIView):
    """
    GET /api/admin/evaluation-results/

    Query parameters:
      education_level=COLLEGE | BASIC | BOTH
      academic_year=2026-2027
      semester=1st | 2nd

    Returns dashboard statistics, teacher averages, section averages,
    question averages, rating distribution, and written feedback.
    """

    permission_classes = [IsAdminAccount]

    def get(self, request):
        division = str(
            request.query_params.get("education_level", "COLLEGE")
        ).strip().upper()

        if division not in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
            "BOTH",
        ]:
            return Response(
                {"detail": "Use COLLEGE, BASIC, or BOTH."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        academic_year = str(
            request.query_params.get("academic_year", "")
        ).strip()

        semester = str(
            request.query_params.get("semester", "")
        ).strip()

        # ----------------------------------------
        # 1. Base evaluation queryset
        # ----------------------------------------
        evaluations = TeacherEvaluation.objects.select_related(
            "teacher",
            "subject",
            "course",
        )

        if division != "BOTH":
            evaluations = evaluations.filter(
                education_level=division
            )

        if academic_year:
            evaluations = evaluations.filter(
                academic_year=academic_year
            )

        if semester:
            evaluations = evaluations.filter(
                semester=semester
            )

        # ----------------------------------------
        # 2. Overall statistics
        # ----------------------------------------
        evaluation_stats = evaluations.aggregate(
            total=Count("id"),
            average=Avg("overall_rating"),
        )

        total_evaluations = evaluation_stats["total"] or 0
        overall_average = evaluation_stats["average"]

        teachers_evaluated = (
            evaluations.values("teacher_id")
            .distinct()
            .count()
        )

        # Count only numeric question responses.
        numeric_items = EvaluationItem.objects.filter(
            evaluation__in=evaluations,
            rating__in=["1", "2", "3", "4", "5"],
        )

        responses_counted = numeric_items.count()

        # ----------------------------------------
        # 3. Teacher results
        # ----------------------------------------
        teacher_rows = (
            evaluations
            .values(
                "teacher_id",
                "teacher__first_name",
                "teacher__last_name",
                "teacher__education_level",
                "teacher__is_archived",
            )
            .annotate(
                evaluation_count=Count("id"),
                average_rating=Avg("overall_rating"),
            )
        )

        teacher_results = []

        for row in teacher_rows:
            full_name = (
                f"{row['teacher__first_name'] or ''} "
                f"{row['teacher__last_name'] or ''}"
            ).strip()

            teacher_results.append({
                "teacher_id": row["teacher_id"],
                "teacher_name": full_name,
                "education_level": row["teacher__education_level"],
                "is_archived": row["teacher__is_archived"],
                "evaluation_count": row["evaluation_count"],
                "average_rating": (
                    round(row["average_rating"], 2)
                    if row["average_rating"] is not None
                    else None
                ),
            })

        teacher_results.sort(
            key=lambda item: (
                item["average_rating"] is None,
                -(item["average_rating"] or 0),
                item["teacher_name"].lower(),
            )
        )

        # ----------------------------------------
        # 4. Section averages
        # ----------------------------------------
        section_scores = SectionEvaluation.objects.filter(
            evaluation__in=evaluations,
            average_rating__isnull=False,
        )

        section_rows = (
            section_scores
            .values(
                "section_id",
                "section__prefix",
                "section__title",
                "section__order",
            )
            .annotate(
                average_rating=Avg("average_rating"),
                evaluation_count=Count("id"),
            )
            .order_by("section__order")
        )

        section_results = [
            {
                "section_id": row["section_id"],
                "prefix": row["section__prefix"],
                "title": row["section__title"],
                "average_rating": round(
                    row["average_rating"], 2
                ),
                "evaluation_count": row["evaluation_count"],
            }
            for row in section_rows
        ]

        # ----------------------------------------
        # 5. Question averages
        # ----------------------------------------
        question_rows = (
            numeric_items
            .values(
                "question_id",
                "question__text",
                "question__order",
                "question__section_id",
                "question__section__prefix",
                "question__section__title",
                "question__section__order",
            )
            .annotate(
                average_rating=Avg(
                    Cast("rating", FloatField())
                ),
                response_count=Count("id"),
            )
            .order_by(
                "question__section__order",
                "question__order",
            )
        )

        question_results = [
            {
                "question_id": row["question_id"],
                "question": row["question__text"],
                "question_order": row["question__order"],
                "section_id": row["question__section_id"],
                "section_prefix": row["question__section__prefix"],
                "section_title": row["question__section__title"],
                "average_rating": round(
                    row["average_rating"], 2
                ),
                "response_count": row["response_count"],
            }
            for row in question_rows
        ]

        # ----------------------------------------
        # 6. Rating distribution
        # ----------------------------------------
        distribution_rows = (
            numeric_items
            .values("rating")
            .annotate(total=Count("id"))
        )

        distribution_lookup = {
            row["rating"]: row["total"]
            for row in distribution_rows
        }

        rating_labels = {
            "5": "Outstanding",
            "4": "Good",
            "3": "Average",
            "2": "Needs Improvement",
            "1": "Unsatisfactory",
        }

        rating_distribution = [
            {
                "rating": rating,
                "label": rating_labels[rating],
                "count": distribution_lookup.get(rating, 0),
            }
            for rating in ["5", "4", "3", "2", "1"]
        ]

        # ----------------------------------------
        # 7. Written feedback
        # ----------------------------------------
        feedback_records = (
            evaluations
            .filter(
                Q(commendable_features__gt="")
                | Q(suggestions_improvement__gt="")
            )
            .order_by("-submitted_at", "-pk")[:30]
        )

        feedback = [
            {
                "evaluation_id": item.id,
                "teacher_id": item.teacher_id,
                "teacher_name": item.teacher.full_name,
                "subject": (
                    item.subject.name if item.subject else None
                ),
                "course": (
                    item.course.name if item.course else None
                ),
                "commendable_features": (
                    item.commendable_features or ""
                ),
                "suggestions_improvement": (
                    item.suggestions_improvement or ""
                ),
                "submitted_at": item.submitted_at,
            }
            for item in feedback_records
        ]

        # ----------------------------------------
        # 8. Available evaluation periods
        # ----------------------------------------
        periods = EvaluationPeriod.objects.all()

        if division != "BOTH":
            periods = periods.filter(
                education_level=division
            )

        available_periods = list(
            periods
            .values(
                "education_level",
                "academic_year",
                "semester",
            )
            .distinct()
            .order_by(
                "-academic_year",
                "semester",
                "education_level",
            )
        )

        # ----------------------------------------
        # 9. Response
        # ----------------------------------------
        return Response({
            "filters": {
                "education_level": division,
                "academic_year": academic_year or None,
                "semester": semester or None,
            },

            "statistics": {
                "total_evaluations": total_evaluations,
                "teachers_evaluated": teachers_evaluated,
                "overall_average": (
                    round(overall_average, 2)
                    if overall_average is not None
                    else None
                ),
                "responses_counted": responses_counted,
            },

            "teacher_results": teacher_results,
            "section_results": section_results,
            "question_results": question_results,
            "rating_distribution": rating_distribution,
            "feedback": feedback,
            "available_periods": available_periods,
        })



class AdminInstitutionalReportsView(APIView):
    """
    GET /api/admin/reports/institutional/

    Institutional comparison between College and Basic Education.

    Optional query parameters:
        education_level=BOTH | COLLEGE | BASIC
        academic_year=2026-2027
        semester=1st | 2nd

    Returns:
        - Institutional statistics
        - College vs Basic Education comparison
        - Academic year / semester trends
        - Questionnaire section performance
        - Rating distribution
        - Available academic periods
    """

    permission_classes = [IsAdminAccount]

    def get(self, request):
        division = str(
            request.query_params.get("education_level", "BOTH")
        ).strip().upper()

        if division not in [
            "BOTH",
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            return Response(
                {"detail": "Use BOTH, COLLEGE, or BASIC."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        academic_year = str(
            request.query_params.get("academic_year", "")
        ).strip()

        semester = str(
            request.query_params.get("semester", "")
        ).strip()

        if semester and semester not in ["1st", "2nd"]:
            return Response(
                {"detail": "Semester must be 1st or 2nd."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 1. BASE QUERYSET
        # -------------------------------------------------

        evaluations = TeacherEvaluation.objects.all()

        if division != "BOTH":
            evaluations = evaluations.filter(
                education_level=division
            )

        if academic_year:
            evaluations = evaluations.filter(
                academic_year=academic_year
            )

        if semester:
            evaluations = evaluations.filter(
                semester=semester
            )

        # -------------------------------------------------
        # 2. HELPER: DIVISION STATISTICS
        # -------------------------------------------------

        def get_division_statistics(level):
            division_evaluations = evaluations.filter(
                education_level=level
            )

            total = division_evaluations.count()

            teachers = (
                division_evaluations
                .values("teacher_id")
                .distinct()
                .count()
            )

            # Average of saved section scores.
            section_average = (
                SectionEvaluation.objects
                .filter(
                    evaluation__in=division_evaluations,
                    average_rating__isnull=False,
                )
                .aggregate(value=Avg("average_rating"))["value"]
            )

            # Count numeric question responses.
            numeric_responses = EvaluationItem.objects.filter(
                evaluation__in=division_evaluations,
                rating__in=["1", "2", "3", "4", "5"],
            ).count()

            not_observed = EvaluationItem.objects.filter(
                evaluation__in=division_evaluations,
                rating="N",
            ).count()

            return {
                "education_level": level,
                "division_name": (
                    "College"
                    if level == EducationLevel.COLLEGE
                    else "Basic Education"
                ),
                "total_evaluations": total,
                "teachers_evaluated": teachers,
                "overall_average": (
                    round(section_average, 2)
                    if section_average is not None
                    else None
                ),
                "numeric_responses": numeric_responses,
                "not_observed_responses": not_observed,
            }

        # Always return both divisions for comparison.
        college_stats = get_division_statistics(
            EducationLevel.COLLEGE
        )

        basic_stats = get_division_statistics(
            EducationLevel.BASIC
        )

        division_comparison = [
            college_stats,
            basic_stats,
        ]

        # -------------------------------------------------
        # 3. INSTITUTIONAL STATISTICS
        # -------------------------------------------------

        total_evaluations = evaluations.count()

        teachers_evaluated = (
            evaluations
            .values("teacher_id")
            .distinct()
            .count()
        )

        section_average = (
            SectionEvaluation.objects
            .filter(
                evaluation__in=evaluations,
                average_rating__isnull=False,
            )
            .aggregate(value=Avg("average_rating"))["value"]
        )

        total_numeric_responses = EvaluationItem.objects.filter(
            evaluation__in=evaluations,
            rating__in=["1", "2", "3", "4", "5"],
        ).count()

        total_not_observed = EvaluationItem.objects.filter(
            evaluation__in=evaluations,
            rating="N",
        ).count()

        # Count active teachers belonging to the selected division(s).
        teacher_queryset = Teacher.objects.filter(
            is_archived=False
        )

        if division != "BOTH":
            teacher_queryset = teacher_queryset.filter(
                education_level=division
            )

        total_active_teachers = teacher_queryset.count()

        participation_rate = (
            round(
                teachers_evaluated / total_active_teachers * 100,
                2,
            )
            if total_active_teachers
            else 0
        )

        statistics = {
            "total_evaluations": total_evaluations,
            "teachers_evaluated": teachers_evaluated,
            "total_active_teachers": total_active_teachers,
            "participation_rate": participation_rate,
            "overall_average": (
                round(section_average, 2)
                if section_average is not None
                else None
            ),
            "numeric_responses": total_numeric_responses,
            "not_observed_responses": total_not_observed,
            "total_responses": (
                total_numeric_responses + total_not_observed
            ),
        }

        # -------------------------------------------------
        # 4. ACADEMIC YEAR / SEMESTER TRENDS
        # -------------------------------------------------

        trend_rows = (
            evaluations
            .values(
                "education_level",
                "academic_year",
                "semester",
            )
            .annotate(
                total_evaluations=Count("id"),
                teachers_evaluated=Count(
                    "teacher_id",
                    distinct=True,
                ),
                overall_average=Avg("overall_rating"),
            )
            .order_by(
                "academic_year",
                "semester",
                "education_level",
            )
        )

        period_trends = []

        for row in trend_rows:
            period_trends.append({
                "education_level": row["education_level"],
                "division_name": (
                    "College"
                    if row["education_level"] == EducationLevel.COLLEGE
                    else "Basic Education"
                ),
                "academic_year": row["academic_year"],
                "semester": row["semester"],
                "total_evaluations": row["total_evaluations"],
                "teachers_evaluated": row["teachers_evaluated"],
                "overall_average": (
                    round(row["overall_average"], 2)
                    if row["overall_average"] is not None
                    else None
                ),
            })

        # -------------------------------------------------
        # 5. SECTION PERFORMANCE BY DIVISION
        # -------------------------------------------------

        section_rows = (
            SectionEvaluation.objects
            .filter(
                evaluation__in=evaluations,
                average_rating__isnull=False,
            )
            .values(
                "evaluation__education_level",
                "section_id",
                "section__prefix",
                "section__title",
                "section__order",
            )
            .annotate(
                average_rating=Avg("average_rating"),
                evaluation_count=Count("evaluation_id"),
            )
            .order_by(
                "section__order",
                "evaluation__education_level",
            )
        )

        section_performance = [
            {
                "education_level": row[
                    "evaluation__education_level"
                ],
                "division_name": (
                    "College"
                    if row["evaluation__education_level"]
                    == EducationLevel.COLLEGE
                    else "Basic Education"
                ),
                "section_id": row["section_id"],
                "prefix": row["section__prefix"],
                "title": row["section__title"],
                "order": row["section__order"],
                "average_rating": round(
                    row["average_rating"], 2
                ),
                "evaluation_count": row["evaluation_count"],
            }
            for row in section_rows
        ]

        # -------------------------------------------------
        # 6. RATING DISTRIBUTION
        # -------------------------------------------------

        rating_rows = (
            EvaluationItem.objects
            .filter(evaluation__in=evaluations)
            .values(
                "evaluation__education_level",
                "rating",
            )
            .annotate(total=Count("id"))
        )

        distribution_lookup = {
            (
                row["evaluation__education_level"],
                row["rating"],
            ): row["total"]
            for row in rating_rows
        }

        rating_labels = {
            "5": "Outstanding",
            "4": "Good",
            "3": "Average",
            "2": "Needs Improvement",
            "1": "Unsatisfactory",
            "N": "Not Observed",
        }

        rating_distribution = []

        for level in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            for rating in ["5", "4", "3", "2", "1", "N"]:
                rating_distribution.append({
                    "education_level": level,
                    "division_name": (
                        "College"
                        if level == EducationLevel.COLLEGE
                        else "Basic Education"
                    ),
                    "rating": rating,
                    "label": rating_labels[rating],
                    "count": distribution_lookup.get(
                        (level, rating),
                        0,
                    ),
                })

        # -------------------------------------------------
        # 7. AVAILABLE ACADEMIC PERIODS
        # -------------------------------------------------

        periods = EvaluationPeriod.objects.all()

        if division != "BOTH":
            periods = periods.filter(
                education_level=division
            )

        available_periods = list(
            periods
            .values(
                "education_level",
                "academic_year",
                "semester",
            )
            .distinct()
            .order_by(
                "-academic_year",
                "semester",
                "education_level",
            )
        )

        # -------------------------------------------------
        # 8. RESPONSE
        # -------------------------------------------------

        return Response({
            "filters": {
                "education_level": division,
                "academic_year": academic_year or None,
                "semester": semester or None,
            },

            "statistics": statistics,

            "division_comparison": division_comparison,

            "period_trends": period_trends,

            "section_performance": section_performance,

            "rating_distribution": rating_distribution,

            "available_periods": available_periods,
        })


class AdminEvaluationListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminEvaluationListView(APIView):
    """
    GET /api/v1/admin/evaluations/

    Lists submitted teacher evaluations.
    Supports filtering, searching, and pagination.
    """

    permission_classes = [IsAdminAccount]

    def get(self, request):
        evaluations = (
            TeacherEvaluation.objects
            .select_related("teacher", "subject", "course")
            .order_by("-submitted_at")
        )

        # Education level filter
        education_level = request.query_params.get("education_level")

        if education_level and education_level.upper() != "BOTH":
            evaluations = evaluations.filter(
                education_level=education_level.upper()
            )

        # Academic year filter
        academic_year = request.query_params.get("academic_year")

        if academic_year:
            evaluations = evaluations.filter(
                academic_year=academic_year
            )

        # Semester filter
        semester = request.query_params.get("semester")

        if semester:
            evaluations = evaluations.filter(
                semester=semester
            )

        # Search filter
        search = request.query_params.get("search", "").strip()

        if search:
            evaluations = evaluations.filter(
                Q(student_name__icontains=search)
                | Q(student_id__icontains=search)
                | Q(teacher__first_name__icontains=search)
                | Q(teacher__last_name__icontains=search)
                | Q(subject__name__icontains=search)
                | Q(course__name__icontains=search)
            )

        paginator = AdminEvaluationListPagination()
        page = paginator.paginate_queryset(
            evaluations,
            request,
            view=self,
        )

        records = []

        for evaluation in page:
            records.append({
                "id": evaluation.id,
                "education_level": evaluation.education_level,
                "teacher": evaluation.teacher.full_name,
                "subject": (
                    evaluation.subject.name
                    if evaluation.subject else None
                ),
                "course": (
                    evaluation.course.name
                    if evaluation.course else None
                ),
                "student_id": evaluation.student_id,
                "student_name": evaluation.student_name,
                "semester": evaluation.semester,
                "academic_year": evaluation.academic_year,
                "year_level": evaluation.year_level,
                "overall_rating": evaluation.overall_rating,
                "submitted_at": evaluation.submitted_at,
            })

        return paginator.get_paginated_response(records)

class AdminEvaluationDetailView(APIView):
    """
    GET /api/v1/admin/evaluations/<id>/

    Returns one complete submitted evaluation report.
    Uses saved EvaluationItem records so historical reports
    do not depend on the current questionnaire configuration.
    """

    permission_classes = [IsAdminAccount]

    def get(self, request, pk):
        evaluation = get_object_or_404(
            TeacherEvaluation.objects.select_related(
                "teacher",
                "subject",
                "course",
            ),
            pk=pk,
        )

        # Get the actual saved answers for this submission.
        items = (
            EvaluationItem.objects
            .filter(evaluation=evaluation)
            .select_related("question__section")
            .order_by(
                "question__section__order",
                "question__order",
            )
        )

        # Get the saved section totals and averages.
        section_scores = {
            score.section_id: score
            for score in (
                SectionEvaluation.objects
                .filter(evaluation=evaluation)
                .select_related("section")
            )
        }

        rating_labels = {
            str(value): label
            for value, label in EvaluationItem.RATING_CHOICES
        }

        sections_by_id = {}

        for item in items:
            section = item.question.section
            rating = str(item.rating)

            if section.id not in sections_by_id:
                saved_score = section_scores.get(section.id)

                sections_by_id[section.id] = {
                    "id": section.id,
                    "prefix": section.prefix,
                    "title": section.title,
                    "order": section.order,
                    "total_score": (
                        saved_score.total_score
                        if saved_score
                        else 0
                    ),
                    "average_rating": (
                        saved_score.average_rating
                        if saved_score
                        else None
                    ),
                    "questions": [],
                }

            sections_by_id[section.id]["questions"].append({
                "id": item.question_id,
                "order": item.question.order,
                "text": item.question.text,
                "rating": rating,
                "rating_label": rating_labels.get(
                    rating,
                    rating,
                ),
            })

        sections = sorted(
            sections_by_id.values(),
            key=lambda section: section["order"],
        )

        return Response({
            "evaluation": {
                "id": evaluation.id,
                "education_level": evaluation.education_level,
                "teacher": {
                    "id": evaluation.teacher_id,
                    "first_name": evaluation.teacher.first_name,
                    "last_name": evaluation.teacher.last_name,
                    "full_name": evaluation.teacher.full_name,
                },
                "subject": (
                    evaluation.subject.name
                    if evaluation.subject
                    else None
                ),
                "course": (
                    evaluation.course.name
                    if evaluation.course
                    else None
                ),
                "semester": evaluation.semester,
                "academic_year": evaluation.academic_year,
                "year_level": evaluation.year_level,
                "student_id": evaluation.student_id,
                "student_name": evaluation.student_name or "",
                "submitted_at": evaluation.submitted_at,
                "overall_rating": evaluation.overall_rating,
                "commendable_features": (
                    evaluation.commendable_features or ""
                ),
                "suggestions_improvement": (
                    evaluation.suggestions_improvement or ""
                ),
            },
            "sections": sections,
            "total_questions": sum(
                len(section["questions"])
                for section in sections
            ),
        })

class StudentEvaluationSetupView(APIView):
    """
    Public setup data for the student evaluation portal.

    The division controls which teachers and active period are returned.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        division = request.query_params.get("division", "").upper()

        if division not in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            return Response(
                {
                    "detail": "Invalid division. Use COLLEGE or BASIC."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()

        # Only teachers belonging to the requested division.
        teachers = Teacher.objects.filter(
            education_level=division
        ).order_by("last_name", "first_name")

        # Only an open period whose date range includes today.
        active_period = EvaluationPeriod.objects.filter(
            education_level=division,
            is_open=True,
            start_date__lte=today,
            end_date__gte=today,
        ).first()

        # College courses are relevant to the College form only.
        courses = (
            Course.objects.all().order_by("name")
            if division == EducationLevel.COLLEGE
            else Course.objects.none()
        )

        # Sections and questions are currently shared because your
        # Section and Question models do not have an education_level field.
        sections = (
            Section.objects
            .filter(education_level=division)
            .prefetch_related("questions")
            .order_by("order", "prefix")
        )

        return Response({
            "division": division,

            "active_period": (
                {
                    "id": active_period.id,
                    "semester": active_period.semester,
                    "academic_year": active_period.academic_year,
                    "start_date": active_period.start_date,
                    "end_date": active_period.end_date,
                }
                if active_period
                else None
            ),

            "teachers": [
                {
                    "id": teacher.id,
                    "first_name": teacher.first_name or "",
                    "last_name": teacher.last_name or "",
                    "full_name": teacher.full_name,
                }
                for teacher in teachers
            ],

            "courses": [
                {
                    "id": course.id,
                    "name": course.name,
                    "code": course.code,
                }
                for course in courses
            ],

            "sections": [
                {
                    "id": section.id,
                    "prefix": section.prefix,
                    "title": section.title,
                    "questions": [
                        {
                            "id": question.id,
                            "order": question.order,
                            "text": question.text,
                        }
                        for question in section.questions.filter(is_active=True)
                    ],
                }
                for section in sections
            ],
        })

class StudentEvaluationSubmitView(APIView):
    """
    Public endpoint for submitting a completed teacher evaluation.
    All validation and saving are performed server-side.
    """

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data

        # ----------------------------------------
        # 1. Validate division
        # ----------------------------------------
        division = str(data.get("division", "")).upper()

        if division not in [EducationLevel.COLLEGE, EducationLevel.BASIC]:
            return Response(
                {"detail": "Invalid education division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 2. Validate student information
        # ----------------------------------------
        student_id = str(data.get("student_id", "")).strip()

        if not student_id:
            return Response(
                {"student_id": "Student ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(student_id) > 10:
            return Response(
                {"student_id": "Student ID cannot exceed 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not Student.objects.filter(student_id=student_id).exists():
            return Response(
                {"student_id": "Student ID is not registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_name = str(data.get("student_name", "")).strip()

        if len(student_name) > 100:
            return Response(
                {"student_name": "Student name cannot exceed 100 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 3. Validate teacher
        # ----------------------------------------
        try:
            teacher_id = int(data.get("teacher"))
        except (TypeError, ValueError):
            return Response(
                {"teacher": "Please select a valid teacher."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher = Teacher.objects.filter(
            pk=teacher_id,
            education_level=division,
        ).first()

        if not teacher:
            return Response(
                {"teacher": "The selected teacher does not belong to this division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 4. Validate active evaluation period
        # ----------------------------------------
        today = timezone.localdate()

        active_period = EvaluationPeriod.objects.filter(
            education_level=division,
            is_open=True,
            start_date__lte=today,
            end_date__gte=today,
        ).first()

        if not active_period:
            return Response(
                {"detail": "There is no active evaluation period for this division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 5. Validate subject
        # ----------------------------------------
        subject_name = str(data.get("subject", "")).strip()

        if not subject_name:
            return Response(
                {"subject": "Subject is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(subject_name) > 100:
            return Response(
                {"subject": "Subject cannot exceed 100 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = Subject.objects.filter(
            name__iexact=subject_name
        ).first()

        if subject is None:
            subject = Subject.objects.create(name=subject_name)

        # ----------------------------------------
        # 6. Validate course
        # ----------------------------------------
        course = None

        if division == EducationLevel.COLLEGE:
            try:
                course_id = int(data.get("course"))
            except (TypeError, ValueError):
                return Response(
                    {"course": "Please select a valid course."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            course = Course.objects.filter(pk=course_id).first()

            if not course:
                return Response(
                    {"course": "The selected course does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not teacher.courses.filter(pk=course.pk).exists():
                return Response(
                    {"course": "The selected course is not assigned to this teacher."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ----------------------------------------
        # 7. Validate year / grade level
        # ----------------------------------------
        year_level = str(data.get("year_level", "")).strip()

        if not year_level or len(year_level) > 20:
            return Response(
                {"year_level": "Please provide a valid year or grade level."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 8. Validate all questionnaire answers
        # ----------------------------------------
        answers = data.get("answers")

        if not isinstance(answers, dict):
            return Response(
                {"answers": "Evaluation answers must be provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions = list(
            Question.objects
            .select_related("section")
            .filter(
                section__education_level=division,
                is_active=True,
            )
            .order_by("section__order", "order")
        )

        expected_question_ids = {question.id for question in questions}

        normalized_answers = {}

        try:
            for question_id, rating in answers.items():
                normalized_answers[int(question_id)] = str(rating)
        except (TypeError, ValueError):
            return Response(
                {"answers": "One or more question IDs are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if set(normalized_answers.keys()) != expected_question_ids:
            return Response(
                {
                    "answers": (
                        "Please answer every evaluation question. "
                        "Missing or unexpected questions were detected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_ratings = {
            choice[0] for choice in EvaluationItem.RATING_CHOICES
        }

        invalid_answers = {
            question_id: rating
            for question_id, rating in normalized_answers.items()
            if rating not in allowed_ratings
        }

        if invalid_answers:
            return Response(
                {"answers": "One or more ratings are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not questions:
            return Response(
                {"detail": "No evaluation questions are configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------
        # 9. Optional feedback
        # ----------------------------------------
        commendable_features = str(
            data.get("commendable_features") or ""
        ).strip()

        suggestions_improvement = str(
            data.get("suggestions_improvement") or ""
        ).strip()

        # ----------------------------------------
        # 10. Prevent duplicate evaluations
        # ----------------------------------------
        duplicate = TeacherEvaluation.objects.filter(
            teacher=teacher,
            student_id=student_id,
            subject=subject,
            course=course,
            semester=active_period.semester,
            academic_year=active_period.academic_year,
            education_level=division,
        ).exists()

        if duplicate:
            return Response(
                {
                    "detail": (
                        "You have already evaluated this teacher "
                        "for this subject and evaluation period."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        # ----------------------------------------
        # 11. Create evaluation
        # ----------------------------------------
        evaluation = TeacherEvaluation.objects.create(
            teacher=teacher,
            education_level=division,
            student_id=student_id,
            student_name=student_name or None,
            subject=subject,
            course=course,
            semester=active_period.semester,
            academic_year=active_period.academic_year,
            year_level=year_level,
            commendable_features=commendable_features,
            suggestions_improvement=suggestions_improvement,
        )

        # ----------------------------------------
        # 12. Save individual question ratings
        # ----------------------------------------
        evaluation_items = [
            EvaluationItem(
                evaluation=evaluation,
                question=question,
                rating=normalized_answers[question.id],
            )
            for question in questions
        ]

        EvaluationItem.objects.bulk_create(evaluation_items)

        # ----------------------------------------
        # 13. Calculate section scores
        # ----------------------------------------
        section_scores = []

        for section in Section.objects.filter(
                education_level=division
            ).order_by("order"):
            section_questions = [
                question
                for question in questions
                if question.section_id == section.id
            ]

            numeric_ratings = [
                int(normalized_answers[question.id])
                for question in section_questions
                if normalized_answers[question.id] != "N"
            ]

            total_score = sum(numeric_ratings)

            average_rating = (
                round(total_score / len(numeric_ratings), 2)
                if numeric_ratings
                else None
            )

            section_scores.append(
                SectionEvaluation(
                    evaluation=evaluation,
                    section=section,
                    average_rating=average_rating,
                    total_score=total_score,
                )
            )

        SectionEvaluation.objects.bulk_create(section_scores)

        # ----------------------------------------
        # 14. Calculate overall rating
        # ----------------------------------------
        all_numeric_ratings = [
            int(rating)
            for rating in normalized_answers.values()
            if rating != "N"
        ]

        evaluation.overall_rating = (
            round(
                sum(all_numeric_ratings) / len(all_numeric_ratings),
                2,
            )
            if all_numeric_ratings
            else None
        )

        evaluation.save(update_fields=["overall_rating"])

        # ----------------------------------------
        # 15. Return successful response
        # ----------------------------------------
        return Response(
            {
                "detail": "Your teacher evaluation was submitted successfully.",
                "evaluation_id": evaluation.id,
                "overall_rating": evaluation.overall_rating,
                "total_questions": len(questions),
            },
            status=status.HTTP_201_CREATED,
        )

class StudentIDVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        student_id = str(request.data.get("student_id", "")).strip()

        if not student_id:
            return Response(
                {"valid": False, "message": "Please enter your Student ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(student_id) > 10:
            return Response(
                {"valid": False, "message": "Student ID cannot exceed 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_exists = Student.objects.filter(
            student_id__iexact=student_id
        ).exists()

        if not student_exists:
            return Response(
                {
                    "valid": False,
                    "message": "Student ID not found. Please check your ID or contact the administrator.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "valid": True,
            "message": "Student ID verified successfully.",
        })


class StudentSuggestionSubmitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        education_level = str(
            request.data.get("education_level", "")
        ).strip().upper()

        if education_level not in ["COLLEGE", "BASIC"]:
            return Response(
                {"detail": "Invalid education division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        categories = request.data.get("categories", [])
        message = str(request.data.get("message", "")).strip()

        if not isinstance(categories, list):
            return Response(
                {"detail": "Categories must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_categories = {
            value for value, label in Suggestion.Category.choices
        }

        categories = list(dict.fromkeys(
            str(category).strip().upper()
            for category in categories
        ))

        invalid_categories = [
            category for category in categories
            if category not in allowed_categories
        ]

        if invalid_categories:
            return Response(
                {"detail": "One or more suggestion categories are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not categories and not message:
            return Response(
                {"detail": "Please select a category or write a suggestion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) > 1000:
            return Response(
                {"detail": "Suggestion must not exceed 1000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_name = str(
            request.data.get("student_name", "")
        ).strip()

        student_id = str(
            request.data.get("student_id", "")
        ).strip()

        if len(student_name) > 100:
            return Response(
                {"detail": "Student name is too long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(student_id) > 50:
            return Response(
                {"detail": "Student ID is too long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period = (
            EvaluationPeriod.objects
            .filter(
                education_level=education_level,
                is_open=True,
                start_date__lte=timezone.localdate(),
                end_date__gte=timezone.localdate(),
            )
            .first()
        )

        suggestion = Suggestion.objects.create(
            education_level=education_level,
            semester=period.semester if period else "",
            academic_year=period.academic_year if period else "",
            categories=",".join(categories),
            message=message,
            student_name=student_name,
            student_id=student_id,
        )

        return Response(
            {
                "detail": "Thank you! Your suggestion has been submitted.",
                "suggestion_id": suggestion.pk,
            },
            status=status.HTTP_201_CREATED,
        )

# =========================================================
# ADMIN SUGGESTIONS MANAGEMENT
# =========================================================

class AdminSuggestionListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminSuggestionListView(APIView):
    """
    GET /api/admin/suggestions/

    Supports:
        search=
        education_level=COLLEGE | BASIC
        academic_year=
        semester=1st | 2nd
        category=
        status=NEW | UNDER_REVIEW | IMPLEMENTED | DECLINED
        page=
        page_size=
    """

    permission_classes = [IsAdminAccount]

    def get(self, request):
        suggestions = Suggestion.objects.all().order_by(
            "-created_at",
            "-pk",
        )

        params = request.query_params

        education_level = params.get("education_level", "").strip().upper()
        academic_year = params.get("academic_year", "").strip()
        semester = params.get("semester", "").strip()
        category = params.get("category", "").strip().upper()
        suggestion_status = params.get("status", "").strip().upper()
        search = params.get("search", "").strip()

        if education_level in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            suggestions = suggestions.filter(
                education_level=education_level
            )

        if academic_year:
            suggestions = suggestions.filter(
                academic_year=academic_year
            )

        if semester in ["1st", "2nd"]:
            suggestions = suggestions.filter(
                semester=semester
            )

        # Categories are stored as comma-separated values.
        if category:
            suggestions = suggestions.filter(
                Q(categories=category)
                | Q(categories__startswith=f"{category},")
                | Q(categories__endswith=f",{category}")
                | Q(categories__contains=f",{category},")
            )

        valid_statuses = {
            value for value, label in Suggestion.Status.choices
        }

        if suggestion_status in valid_statuses:
            suggestions = suggestions.filter(
                status=suggestion_status
            )

        if search:
            suggestions = suggestions.filter(
                Q(message__icontains=search)
                | Q(student_name__icontains=search)
                | Q(student_id__icontains=search)
            )

        # Summary counts use the same division/year/semester filters,
        # but do not use search, category, or status filters.
        summary_queryset = Suggestion.objects.all()

        if education_level in [
            EducationLevel.COLLEGE,
            EducationLevel.BASIC,
        ]:
            summary_queryset = summary_queryset.filter(
                education_level=education_level
            )

        if academic_year:
            summary_queryset = summary_queryset.filter(
                academic_year=academic_year
            )

        if semester in ["1st", "2nd"]:
            summary_queryset = summary_queryset.filter(
                semester=semester
            )

        summary = {
            "total": summary_queryset.count(),
            "new": summary_queryset.filter(status="NEW").count(),
            "under_review": summary_queryset.filter(
                status="UNDER_REVIEW"
            ).count(),
            "implemented": summary_queryset.filter(
                status="IMPLEMENTED"
            ).count(),
            "declined": summary_queryset.filter(
                status="DECLINED"
            ).count(),
        }

        paginator = AdminSuggestionListPagination()
        page = paginator.paginate_queryset(
            suggestions,
            request,
            view=self,
        )

        records = []

        category_labels = dict(Suggestion.Category.choices)
        status_labels = dict(Suggestion.Status.choices)

        for suggestion in page:
            category_codes = [
                value.strip()
                for value in (suggestion.categories or "").split(",")
                if value.strip()
            ]

            records.append({
                "id": suggestion.pk,
                "education_level": suggestion.education_level,
                "semester": suggestion.semester,
                "academic_year": suggestion.academic_year,
                "categories": category_codes,
                "category_labels": [
                    category_labels.get(code, code)
                    for code in category_codes
                ],
                "message": suggestion.message,
                "student_name": suggestion.student_name or "",
                "student_id": suggestion.student_id or "",
                "status": suggestion.status,
                "status_label": status_labels.get(
                    suggestion.status,
                    suggestion.status,
                ),
                "admin_notes": suggestion.admin_notes or "",
                "created_at": suggestion.created_at,
                "updated_at": suggestion.updated_at,
            })

        response = paginator.get_paginated_response(records)
        response.data["summary"] = summary

        return response


class AdminSuggestionDetailView(APIView):
    """
    GET   /api/admin/suggestions/<id>/
    PATCH /api/admin/suggestions/<id>/

    PATCH body:
    {
        "status": "UNDER_REVIEW",
        "admin_notes": "Reviewing this suggestion."
    }
    """

    permission_classes = [IsAdminAccount]

    def get(self, request, pk):
        suggestion = get_object_or_404(
            Suggestion,
            pk=pk,
        )

        category_labels = dict(Suggestion.Category.choices)
        status_labels = dict(Suggestion.Status.choices)

        category_codes = [
            value.strip()
            for value in (suggestion.categories or "").split(",")
            if value.strip()
        ]

        return Response({
            "id": suggestion.pk,
            "education_level": suggestion.education_level,
            "semester": suggestion.semester,
            "academic_year": suggestion.academic_year,
            "categories": category_codes,
            "category_labels": [
                category_labels.get(code, code)
                for code in category_codes
            ],
            "message": suggestion.message,
            "student_name": suggestion.student_name or "",
            "student_id": suggestion.student_id or "",
            "status": suggestion.status,
            "status_label": status_labels.get(
                suggestion.status,
                suggestion.status,
            ),
            "admin_notes": suggestion.admin_notes or "",
            "created_at": suggestion.created_at,
            "updated_at": suggestion.updated_at,
        })

    def patch(self, request, pk):
        suggestion = get_object_or_404(
            Suggestion,
            pk=pk,
        )

        allowed_statuses = {
            value for value, label in Suggestion.Status.choices
        }

        update_fields = []

        if "status" in request.data:
            new_status = str(
                request.data.get("status", "")
            ).strip().upper()

            if new_status not in allowed_statuses:
                return Response(
                    {
                        "status": (
                            "Invalid status. Use NEW, UNDER_REVIEW, "
                            "IMPLEMENTED, or DECLINED."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            suggestion.status = new_status
            update_fields.append("status")

        if "admin_notes" in request.data:
            admin_notes = str(
                request.data.get("admin_notes") or ""
            ).strip()

            notes_field = Suggestion._meta.get_field("admin_notes")
            max_length = notes_field.max_length

            if max_length and len(admin_notes) > max_length:
                return Response(
                    {
                        "admin_notes": (
                            f"Admin notes cannot exceed "
                            f"{max_length} characters."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            suggestion.admin_notes = admin_notes
            update_fields.append("admin_notes")

        if not update_fields:
            return Response(
                {
                    "detail": (
                        "Provide at least one field to update: "
                        "status or admin_notes."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(suggestion, "updated_at"):
            update_fields.append("updated_at")

        suggestion.save(update_fields=update_fields)

        status_labels = dict(Suggestion.Status.choices)

        return Response({
            "detail": "Suggestion updated successfully.",
            "id": suggestion.pk,
            "status": suggestion.status,
            "status_label": status_labels.get(
                suggestion.status,
                suggestion.status,
            ),
            "admin_notes": suggestion.admin_notes or "",
            "updated_at": suggestion.updated_at,
        })

class StudentDuplicateCheckView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        education_level = str(
            request.data.get("education_level", "")
        ).strip().upper()

        student_id = str(
            request.data.get("student_id", "")
        ).strip()

        teacher_id = request.data.get("teacher")
        subject_name = str(
            request.data.get("subject", "")
        ).strip()

        course_id = request.data.get("course") or None

        if education_level not in ["COLLEGE", "BASIC"]:
            return Response(
                {"detail": "Invalid education division."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not student_id or not teacher_id or not subject_name:
            return Response(
                {"duplicate": False, "checked": False},
                status=status.HTTP_200_OK,
            )

        if not Student.objects.filter(
            student_id__iexact=student_id
        ).exists():
            return Response(
                {
                    "duplicate": False,
                    "checked": False,
                    "message": "Student ID is not registered.",
                },
                status=status.HTTP_200_OK,
            )

        period = (
            EvaluationPeriod.objects
            .filter(
                education_level=education_level,
                is_open=True,
                start_date__lte=timezone.localdate(),
                end_date__gte=timezone.localdate(),
            )
            .first()
        )

        if not period:
            return Response(
                {
                    "duplicate": False,
                    "checked": False,
                    "message": "No active evaluation period.",
                },
                status=status.HTTP_200_OK,
            )

        teacher = Teacher.objects.filter(
            pk=teacher_id,
            education_level=education_level,
        ).first()

        if not teacher:
            return Response(
                {
                    "duplicate": False,
                    "checked": False,
                    "message": "Invalid teacher selection.",
                },
                status=status.HTTP_200_OK,
            )

        subject = Subject.objects.filter(
            name__iexact=subject_name
        ).first()

        # If the subject does not exist yet, no matching
        # evaluation can exist for that subject.
        if not subject:
            return Response({
                "duplicate": False,
                "checked": True,
                "message": "No previous evaluation found.",
            })

        course = None

        if education_level == "COLLEGE":
            if not course_id:
                return Response(
                    {"duplicate": False, "checked": False},
                    status=status.HTTP_200_OK,
                )

            course = Course.objects.filter(pk=course_id).first()

            if not course:
                return Response(
                    {
                        "duplicate": False,
                        "checked": False,
                        "message": "Invalid course selection.",
                    },
                    status=status.HTTP_200_OK,
                )

        duplicate = TeacherEvaluation.objects.filter(
            teacher=teacher,
            student_id__iexact=student_id,
            subject=subject,
            course=course,
            semester=period.semester,
            academic_year=period.academic_year,
            education_level=education_level,
        ).exists()

        return Response({
            "duplicate": duplicate,
            "checked": True,
            "message": (
                "You have already evaluated this teacher for this subject "
                "during the current evaluation period."
                if duplicate
                else "No previous evaluation found."
            ),
        })


class AdminTeacherArchiveView(APIView):
    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        teacher = get_object_or_404(Teacher, pk=pk)

        teacher.is_archived = True
        teacher.save(update_fields=["is_archived"])

        return Response(
            {
                "message": "Teacher archived successfully.",
                "teacher_id": teacher.id,
                "is_archived": teacher.is_archived,
            },
            status=status.HTTP_200_OK,
        )


class AdminCourseListView(generics.ListAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAdminAccount]
    queryset = Course.objects.all().order_by("name")


# =========================================================
# ADMIN EVALUATION PERIOD MANAGEMENT
# =========================================================

class AdminEvaluationPeriodListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/periods/
    POST /api/admin/periods/
    """

    serializer_class = EvaluationPeriodSerializer
    permission_classes = [IsAdminAccount]

    def get_queryset(self):
        queryset = EvaluationPeriod.objects.all()

        education_level = self.request.query_params.get("education_level")

        if education_level in [EducationLevel.COLLEGE, EducationLevel.BASIC]:
            queryset = queryset.filter(education_level=education_level)

        return queryset.order_by("-academic_year", "semester", "education_level")


class AdminEvaluationPeriodDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/periods/<id>/
    PATCH /api/admin/periods/<id>/
    """

    serializer_class = EvaluationPeriodSerializer
    permission_classes = [IsAdminAccount]
    queryset = EvaluationPeriod.objects.all()


class AdminEvaluationPeriodOpenView(APIView):
    """
    POST /api/admin/periods/<id>/open/

    Opens a period and closes any other open period in the same division.
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request, pk):
        period = get_object_or_404(EvaluationPeriod, pk=pk)

        EvaluationPeriod.objects.filter(
            education_level=period.education_level,
            is_open=True,
        ).exclude(pk=period.pk).update(is_open=False)

        period.is_open = True
        period.save(update_fields=["is_open", "updated_at"])

        return Response(
            EvaluationPeriodSerializer(period).data,
            status=status.HTTP_200_OK,
        )


class AdminEvaluationPeriodCloseView(APIView):
    """POST /api/admin/periods/<id>/close/"""

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        period = get_object_or_404(EvaluationPeriod, pk=pk)

        period.is_open = False
        period.save(update_fields=["is_open", "updated_at"])

        return Response(
            EvaluationPeriodSerializer(period).data,
            status=status.HTTP_200_OK,
        )

# =========================================================
# ADMIN QUESTIONNAIRE MANAGEMENT
# =========================================================

def questionnaire_payload(education_level):
    sections = (
        Section.objects
        .filter(education_level=education_level)
        .prefetch_related("questions")
        .order_by("order", "prefix")
    )

    return {
        "education_level": education_level,
        "sections": [
            {
                "id": section.id,
                "prefix": section.prefix,
                "title": section.title,
                "order": section.order,
                "questions": [
                    {
                        "id": question.id,
                        "text": question.text,
                        "order": question.order,
                        "is_active": question.is_active,
                    }
                    for question in section.questions.all().order_by("order")
                ],
            }
            for section in sections
        ],
    }


def valid_education_level(value):
    value = str(value or "").strip().upper()

    if value not in [
        EducationLevel.COLLEGE,
        EducationLevel.BASIC,
    ]:
        raise DRFValidationError({
            "education_level": "Use COLLEGE or BASIC."
        })

    return value


class AdminQuestionnaireView(APIView):
    """
    GET /api/admin/questionnaire/?education_level=COLLEGE
    GET /api/admin/questionnaire/?education_level=BASIC
    GET /api/admin/questionnaire/?education_level=BOTH
    """

    permission_classes = [IsAdminAccount]

    def get(self, request):
        division = str(
            request.query_params.get("education_level", "COLLEGE")
        ).strip().upper()

        if division == "BOTH":
            return Response({
                "education_level": "BOTH",
                "questionnaires": [
                    questionnaire_payload(EducationLevel.COLLEGE),
                    questionnaire_payload(EducationLevel.BASIC),
                ],
            })

        division = valid_education_level(division)

        return Response(questionnaire_payload(division))


class AdminQuestionnaireSectionCreateView(APIView):
    """
    POST /api/admin/questionnaire/sections/
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        division = valid_education_level(
            request.data.get("education_level")
        )

        prefix = str(request.data.get("prefix", "")).strip().upper()
        title = str(request.data.get("title", "")).strip()

        if len(prefix) != 1 or not prefix.isalpha():
            raise DRFValidationError({
                "prefix": "Section prefix must be one letter."
            })

        if not title:
            raise DRFValidationError({
                "title": "Section title is required."
            })

        if len(title) > 255:
            raise DRFValidationError({
                "title": "Section title cannot exceed 255 characters."
            })

        if Section.objects.filter(
            education_level=division,
            prefix=prefix,
        ).exists():
            raise DRFValidationError({
                "prefix": "This section prefix already exists."
            })

        next_order = (
            Section.objects
            .filter(education_level=division)
            .aggregate(value=Max("order"))["value"] or 0
        ) + 1

        section = Section.objects.create(
            education_level=division,
            prefix=prefix,
            title=title,
            order=next_order,
        )

        return Response(
            {
                "id": section.id,
                "prefix": section.prefix,
                "title": section.title,
                "order": section.order,
                "questions": [],
            },
            status=status.HTTP_201_CREATED,
        )


class AdminQuestionnaireSectionDetailView(APIView):
    """
    PATCH /api/admin/questionnaire/sections/<id>/
    """

    permission_classes = [IsAdminAccount]

    def patch(self, request, pk):
        section = get_object_or_404(Section, pk=pk)

        title = str(request.data.get("title", "")).strip()

        if not title:
            raise DRFValidationError({
                "title": "Section title is required."
            })

        if len(title) > 255:
            raise DRFValidationError({
                "title": "Section title cannot exceed 255 characters."
            })

        # SectionEvaluation stores historical references to this section.
        if SectionEvaluation.objects.filter(section=section).exists():
            raise DRFValidationError({
                "detail": (
                    "This section has historical evaluation records. "
                    "Its title cannot be changed."
                )
            })

        section.title = title
        section.save(update_fields=["title"])

        return Response({
            "id": section.id,
            "prefix": section.prefix,
            "title": section.title,
            "order": section.order,
        })


class AdminQuestionnaireQuestionCreateView(APIView):
    """
    POST /api/admin/questionnaire/questions/
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        section_id = request.data.get("section")
        text = str(request.data.get("text", "")).strip()

        section = get_object_or_404(Section, pk=section_id)

        if not text:
            raise DRFValidationError({
                "text": "Question text is required."
            })

        next_order = (
            Question.objects
            .filter(section=section)
            .aggregate(value=Max("order"))["value"] or 0
        ) + 1

        question = Question.objects.create(
            section=section,
            text=text,
            order=next_order,
            is_active=True,
        )

        return Response(
            {
                "id": question.id,
                "section": section.id,
                "text": question.text,
                "order": question.order,
                "is_active": question.is_active,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminQuestionnaireQuestionDetailView(APIView):
    """
    PATCH /api/admin/questionnaire/questions/<id>/
    """

    permission_classes = [IsAdminAccount]

    def patch(self, request, pk):
        question = get_object_or_404(Question, pk=pk)

        text = str(request.data.get("text", "")).strip()

        if not text:
            raise DRFValidationError({
                "text": "Question text is required."
            })

        if EvaluationItem.objects.filter(question=question).exists():
            raise DRFValidationError({
                "detail": (
                    "This question has historical evaluation records. "
                    "Its text cannot be changed."
                )
            })

        question.text = text
        question.save(update_fields=["text"])

        return Response({
            "id": question.id,
            "section": question.section_id,
            "text": question.text,
            "order": question.order,
            "is_active": question.is_active,
        })


class AdminQuestionnaireQuestionToggleView(APIView):
    """
    POST /api/admin/questionnaire/questions/<id>/toggle/
    Body: { "is_active": false }
    """

    permission_classes = [IsAdminAccount]

    def post(self, request, pk):
        question = get_object_or_404(Question, pk=pk)

        if "is_active" not in request.data:
            raise DRFValidationError({
                "is_active": "Provide true or false."
            })

        value = request.data.get("is_active")

        if not isinstance(value, bool):
            raise DRFValidationError({
                "is_active": "This field must be true or false."
            })

        question.is_active = value
        question.save(update_fields=["is_active"])

        return Response({
            "id": question.id,
            "is_active": question.is_active,
        })


class AdminQuestionnaireSectionReorderView(APIView):
    """
    POST /api/admin/questionnaire/sections/reorder/

    Body:
    {
        "education_level": "COLLEGE",
        "section_ids": [3, 1, 2]
    }
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        division = valid_education_level(
            request.data.get("education_level")
        )

        section_ids = request.data.get("section_ids")

        if not isinstance(section_ids, list):
            raise DRFValidationError({
                "section_ids": "Provide a list of section IDs."
            })

        sections = list(
            Section.objects
            .filter(education_level=division)
            .order_by("order")
        )

        existing_ids = {section.id for section in sections}

        try:
            submitted_ids = [int(value) for value in section_ids]
        except (TypeError, ValueError):
            raise DRFValidationError({
                "section_ids": "Section IDs must be integers."
            })

        if (
            len(submitted_ids) != len(set(submitted_ids))
            or set(submitted_ids) != existing_ids
        ):
            raise DRFValidationError({
                "section_ids": (
                    "Provide every section ID exactly once "
                    "for the selected division."
                )
            })

        offset = max(
            [item.order for item in sections],
            default=0,
        ) + len(sections) + 1

        for index, section_id in enumerate(submitted_ids, start=1):
            Section.objects.filter(pk=section_id).update(
                order=offset + index
            )

        for index, section_id in enumerate(submitted_ids, start=1):
            Section.objects.filter(pk=section_id).update(
                order=index
            )

        return Response({
            "detail": "Sections reordered successfully."
        })


class AdminQuestionnaireQuestionReorderView(APIView):
    """
    POST /api/admin/questionnaire/questions/reorder/

    Body:
    {
        "section": 3,
        "question_ids": [8, 6, 7]
    }
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        section_id = request.data.get("section")
        section = get_object_or_404(Section, pk=section_id)

        question_ids = request.data.get("question_ids")

        if not isinstance(question_ids, list):
            raise DRFValidationError({
                "question_ids": "Provide a list of question IDs."
            })

        questions = list(
            Question.objects
            .filter(section=section)
            .order_by("order")
        )

        existing_ids = {question.id for question in questions}

        try:
            submitted_ids = [int(value) for value in question_ids]
        except (TypeError, ValueError):
            raise DRFValidationError({
                "question_ids": "Question IDs must be integers."
            })

        if (
            len(submitted_ids) != len(set(submitted_ids))
            or set(submitted_ids) != existing_ids
        ):
            raise DRFValidationError({
                "question_ids": (
                    "Provide every question ID in this section "
                    "exactly once."
                )
            })

        offset = max(
            [question.order for question in questions],
            default=0,
        ) + len(questions) + 1

        for index, question_id in enumerate(submitted_ids, start=1):
            Question.objects.filter(
                pk=question_id,
                section=section,
            ).update(order=offset + index)

        for index, question_id in enumerate(submitted_ids, start=1):
            Question.objects.filter(
                pk=question_id,
                section=section,
            ).update(order=index)

        return Response({
            "detail": "Questions reordered successfully."
        })


class AdminQuestionnaireApplyBothView(APIView):
    """
    POST /api/admin/questionnaire/apply-both/

    Copies the complete source questionnaire to the other division.

    Body:
    {
        "source_division": "COLLEGE"
    }
    """

    permission_classes = [IsAdminAccount]

    @transaction.atomic
    def post(self, request):
        source_division = valid_education_level(
            request.data.get("source_division")
        )

        target_division = (
            EducationLevel.BASIC
            if source_division == EducationLevel.COLLEGE
            else EducationLevel.COLLEGE
        )

        # Never replace a questionnaire that has historical records.
        target_has_question_history = EvaluationItem.objects.filter(
            question__section__education_level=target_division
        ).exists()

        target_has_section_history = SectionEvaluation.objects.filter(
            section__education_level=target_division
        ).exists()

        if target_has_question_history or target_has_section_history:
            raise DRFValidationError({
                "detail": (
                    "The destination division already has historical "
                    "evaluations. Its questionnaire cannot be replaced."
                )
            })

        source_sections = list(
            Section.objects
            .filter(education_level=source_division)
            .prefetch_related("questions")
            .order_by("order", "prefix")
        )

        if not source_sections:
            raise DRFValidationError({
                "detail": "The source division has no sections to copy."
            })

        # Remove destination questions first, because Section uses PROTECT.
        target_sections = Section.objects.filter(
            education_level=target_division
        )

        Question.objects.filter(section__in=target_sections).delete()
        target_sections.delete()

        # Recreate the destination questionnaire in source order.
        for source_section in source_sections:
            new_section = Section.objects.create(
                education_level=target_division,
                prefix=source_section.prefix,
                title=source_section.title,
                order=source_section.order,
            )

            source_questions = source_section.questions.all().order_by(
                "order"
            )

            Question.objects.bulk_create([
                Question(
                    section=new_section,
                    text=question.text,
                    order=question.order,
                    is_active=question.is_active,
                )
                for question in source_questions
            ])

        return Response({
            "detail": (
                "Questionnaire copied successfully."
            ),
            "source_division": source_division,
            "target_division": target_division,
        })