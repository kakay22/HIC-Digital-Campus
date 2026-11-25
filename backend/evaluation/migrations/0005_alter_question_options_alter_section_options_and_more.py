
import django.db.models.deletion
from django.db import migrations, models


def populate_section_order(apps, schema_editor):
    Section = apps.get_model("evaluation", "Section")
    db_alias = schema_editor.connection.alias

    divisions = (
        Section.objects.using(db_alias)
        .values_list("education_level", flat=True)
        .distinct()
    )

    for division in divisions:
        sections = (
            Section.objects.using(db_alias)
            .filter(education_level=division)
            .order_by("id")
        )

        for index, section in enumerate(sections, start=1):
            Section.objects.using(db_alias).filter(
                pk=section.pk
            ).update(order=index)


class Migration(migrations.Migration):

    dependencies = [
        (
            "evaluation",
            "0004_alter_student_options_remove_student_course_and_more",
        ),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="question",
            options={"ordering": ["section__order", "order"]},
        ),
        migrations.AlterModelOptions(
            name="section",
            options={"ordering": ["order", "prefix"]},
        ),
        migrations.AddField(
            model_name="question",
            name="is_active",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name="section",
            name="education_level",
            field=models.CharField(
                choices=[
                    ("COLLEGE", "College"),
                    ("BASIC", "Basic Education"),
                ],
                db_index=True,
                default="COLLEGE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="section",
            name="order",
            field=models.PositiveIntegerField(default=1),
        ),

        # IMPORTANT: Assign unique order values before adding constraints.
        migrations.RunPython(
            populate_section_order,
            migrations.RunPython.noop,
        ),

        migrations.AlterField(
            model_name="evaluationitem",
            name="question",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="evaluation.question",
            ),
        ),
        migrations.AlterField(
            model_name="question",
            name="section",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="questions",
                to="evaluation.section",
            ),
        ),
        migrations.AlterField(
            model_name="section",
            name="prefix",
            field=models.CharField(max_length=1),
        ),
        migrations.AlterField(
            model_name="sectionevaluation",
            name="section",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="evaluation.section",
            ),
        ),
        migrations.AddConstraint(
            model_name="section",
            constraint=models.UniqueConstraint(
                fields=("education_level", "prefix"),
                name="unique_section_prefix_per_division",
            ),
        ),
        migrations.AddConstraint(
            model_name="section",
            constraint=models.UniqueConstraint(
                fields=("education_level", "order"),
                name="unique_section_order_per_division",
            ),
        ),
    ]
