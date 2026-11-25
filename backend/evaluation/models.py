
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class EducationLevel(models.TextChoices):
    COLLEGE = "COLLEGE", "College"
    BASIC = "BASIC", "Basic Education"


class Section(models.Model):
    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.COLLEGE,
        db_index=True,
    )
    prefix = models.CharField(max_length=1)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order", "prefix"]
        constraints = [
            models.UniqueConstraint(
                fields=["education_level", "prefix"],
                name="unique_section_prefix_per_division",
            ),
            models.UniqueConstraint(
                fields=["education_level", "order"],
                name="unique_section_order_per_division",
            ),
        ]

    def __str__(self):
        return f"{self.prefix}. {self.title}"


class Question(models.Model):
    section = models.ForeignKey(
        Section,
        on_delete=models.PROTECT,
        related_name="questions",
    )
    order = models.PositiveIntegerField()
    text = models.TextField()
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["section__order", "order"]
        constraints = [
            models.UniqueConstraint(
                fields=["section", "order"],
                name="unique_question_order_per_section",
            )
        ]

    def __str__(self):
        return f"{self.section.prefix}{self.order}. {self.text[:50]}..."


class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name


class Course(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name


class Teacher(models.Model):
    first_name = models.CharField(max_length=50, null=True, blank=True)
    last_name = models.CharField(max_length=50, null=True, blank=True)
    specialization = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )
    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.COLLEGE,
        db_index=True,
    )
    courses = models.ManyToManyField(
        Course,
        blank=True,
        related_name="teachers",
    )

    is_archived = models.BooleanField(default=False, db_index=True)

    @property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    def __str__(self):
        return self.full_name


class EvaluationPeriod(models.Model):
    class Semester(models.TextChoices):
        FIRST = "1st", "1st Semester"
        SECOND = "2nd", "2nd Semester"

    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.COLLEGE,
        db_index=True,
    )
    academic_year = models.CharField(
        max_length=20,
        help_text="Example: 2026-2027",
    )
    semester = models.CharField(
        max_length=20,
        choices=Semester.choices,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_open = models.BooleanField(
        default=False,
        help_text="Only one evaluation period can be open per division.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-academic_year", "semester"]
        constraints = [
            models.UniqueConstraint(
                fields=["education_level", "academic_year", "semester"],
                name="unique_period_per_division",
            ),
            models.UniqueConstraint(
                fields=["education_level"],
                condition=Q(is_open=True),
                name="one_open_period_per_division",
            ),
        ]
        indexes = [
            models.Index(
                fields=["education_level", "is_open"],
                name="period_level_open_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValidationError({
                    "end_date": "The end date cannot be before the start date."
                })

    def __str__(self):
        status = "Open" if self.is_open else "Closed"
        return (
            f"{self.get_education_level_display()} - "
            f"{self.academic_year} - "
            f"{self.get_semester_display()} ({status})"
        )


class Student(models.Model):
    student_id = models.CharField(max_length=10, unique=True)
    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.COLLEGE,
        db_index=True,
    )
    is_archived = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["student_id"]

    def __str__(self):
        return self.student_id


class TeacherEvaluation(models.Model):
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.PROTECT,
        related_name="evaluations",
    )
    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.COLLEGE,
        db_index=True,
    )
    student_id = models.CharField(max_length=50)
    student_name = models.CharField(max_length=100, null=True, blank=True)
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    semester = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20, blank=True)
    year_level = models.CharField(max_length=20, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    overall_rating = models.FloatField(null=True, blank=True)
    commendable_features = models.TextField(blank=True, null=True)
    suggestions_improvement = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-submitted_at"]
        unique_together = (
            "teacher",
            "student_id",
            "subject",
            "course",
            "semester",
            "academic_year",
            "education_level",
        )
        indexes = [
            models.Index(
                fields=["education_level", "academic_year", "semester"],
                name="evaluation_period_idx",
            ),
            models.Index(
                fields=["teacher", "submitted_at"],
                name="evaluation_teacher_date_idx",
            ),
            models.Index(
                fields=["student_id", "education_level"],
                name="evaluation_student_idx",
            ),
        ]

    @property
    def overall_computed_rating(self):
        ratings = []

        for item in self.items.all():
            try:
                value = float(item.rating)
                ratings.append(value)
            except (ValueError, TypeError):
                continue

        if ratings:
            return round(sum(ratings) / len(ratings), 2)

        return None

    def __str__(self):
        return f"Evaluation #{self.pk} - {self.teacher}"


class EvaluationItem(models.Model):
    RATING_CHOICES = [
        ("5", "Outstanding"),
        ("4", "Good"),
        ("3", "Average"),
        ("2", "Needs Improvement"),
        ("1", "Unsatisfactory"),
        ("N", "Not Observed"),
    ]

    evaluation = models.ForeignKey(
        TeacherEvaluation,
        on_delete=models.CASCADE,
        related_name="items",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.PROTECT,
    )
    rating = models.CharField(
        max_length=2,
        choices=RATING_CHOICES,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["evaluation", "question"],
                name="unique_question_per_evaluation",
            )
        ]

    def __str__(self):
        return (
            f"{self.question.section.prefix}"
            f"{self.question.order} - {self.rating}"
        )


class SectionEvaluation(models.Model):
    evaluation = models.ForeignKey(
        TeacherEvaluation,
        on_delete=models.CASCADE,
        related_name="section_scores",
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.PROTECT,
    )
    average_rating = models.FloatField(null=True, blank=True)
    total_score = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["evaluation", "section"],
                name="unique_section_per_evaluation",
            )
        ]

    def __str__(self):
        return f"Evaluation #{self.evaluation_id} - Section {self.section.prefix}"


class Suggestion(models.Model):
    class Category(models.TextChoices):
        SHORTER_FORM = "SHORTER_FORM", "Shorter / easier form"
        BETTER_QUESTIONS = "BETTER_QUESTIONS", "Clearer or better questions"
        ANONYMITY = "ANONYMITY", "More privacy / anonymity"
        EARLIER = "EARLIER", "Evaluate earlier in the term"
        SEE_RESULTS = "SEE_RESULTS", "See results and changes afterward"
        MOBILE = "MOBILE", "Better mobile experience"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        IMPLEMENTED = "IMPLEMENTED", "Implemented"
        DECLINED = "DECLINED", "Declined"

    education_level = models.CharField(
        max_length=20,
        choices=EducationLevel.choices,
        db_index=True,
    )
    semester = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20, blank=True)
    categories = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True, max_length=1000)
    student_name = models.CharField(max_length=100, blank=True)
    student_id = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["education_level", "status"],
                name="suggestion_level_status_idx",
            ),
        ]

    @property
    def category_labels(self):
        labels = dict(self.Category.choices)
        return [
            labels[category]
            for category in self.categories.split(",")
            if category in labels
        ]

    def __str__(self):
        return f"{self.get_education_level_display()} suggestion #{self.pk}"
