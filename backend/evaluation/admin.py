
from django.contrib import admin
from .models import (
    Section,
    Question,
    Subject,
    Course,
    Teacher,
    EvaluationPeriod,
    TeacherEvaluation,
    EvaluationItem,
    Student,
    SectionEvaluation,
    Suggestion,
)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("prefix", "title")
    search_fields = ("prefix", "title")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("section", "order", "text")
    list_filter = ("section",)
    search_fields = ("text",)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("full_name", "education_level", "specialization")
    list_filter = ("education_level",)
    search_fields = ("first_name", "last_name")


@admin.register(EvaluationPeriod)
class EvaluationPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "education_level",
        "academic_year",
        "semester",
        "start_date",
        "end_date",
        "is_open",
    )
    list_filter = ("education_level", "semester", "is_open")


class EvaluationItemInline(admin.TabularInline):
    model = EvaluationItem
    extra = 0


class SectionEvaluationInline(admin.TabularInline):
    model = SectionEvaluation
    extra = 0


@admin.register(TeacherEvaluation)
class TeacherEvaluationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "teacher",
        "student_id",
        "education_level",
        "semester",
        "academic_year",
        "overall_rating",
        "submitted_at",
    )
    list_filter = ("education_level", "semester", "academic_year")
    search_fields = ("student_id", "teacher__first_name", "teacher__last_name")
    inlines = [EvaluationItemInline, SectionEvaluationInline]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("student_id",)
    search_fields = ("student_id",)


@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "education_level",
        "status",
        "created_at",
    )
    list_filter = ("education_level", "status")
    search_fields = ("student_id", "student_name", "message")
