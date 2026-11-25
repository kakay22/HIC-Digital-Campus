
from django.db import transaction
from evaluation.models import Section, Question

QUESTION_GROUPS = {
    "A": {
        "title": "Instructional Competence",
        "questions": [
            "Utilizes notebook and/or other guides effectively.",
            "Demonstrates sufficient mastery of content.",
            "Makes effective use of a variety of available materials.",
            "Makes clear, practical demonstrations.",
            "Provides for students participation.",
            "Uses logical, purposeful, and thought-provoking questions.",
            "Provides interesting and adequate reinforcement.",
            "Varies procedures in working with students of varying abilities.",
            "Provides motivations.",
        ],
    },
    "B": {
        "title": "Preparation and Organization",
        "questions": [
            "Displays evidence of teacher preparations.",
            "Directions to students are clearly thought out and well stated.",
            "Material are organized and available.",
            "Provides enrichment and/or remediation when needed.",
            "Carefully plans student's assignments.",
        ],
    },
    "C": {
        "title": "Classroom Management and Professionalism",
        "questions": [
            "Maintains student interests and attention.",
            "Works constructively with individuals or groups.",
            "Manages routine to avoid confusion.",
            "Exhibits poise, voice control and tact.",
            'Graciously accepts more than "right" response with slow students.',
            "Makes supportive statements to students.",
            "Maintains professionalism even after classes.",
            "Maintains a friendly and respectful teacher-student relationship.",
        ],
    },
}


@transaction.atomic
def seed_questions():
    # Make sure unused sections do not contain questions.
    for prefix in ["D", "E"]:
        old_section = Section.objects.filter(prefix=prefix).first()

        if old_section:
            if old_section.questions.exists():
                raise Exception(
                    f"Section {prefix} still has questions. "
                    "Please review it before deleting."
                )
            old_section.delete()

    total = 0

    for prefix, data in QUESTION_GROUPS.items():
        section, _ = Section.objects.update_or_create(
            prefix=prefix,
            defaults={"title": data["title"]},
        )

        for order, question_text in enumerate(data["questions"], start=1):
            Question.objects.update_or_create(
                section=section,
                order=order,
                defaults={"text": question_text},
            )
            total += 1

    print("\n====================================")
    print("EVALUATION QUESTIONS SEEDED SUCCESSFULLY")
    print("====================================")

    for prefix, data in QUESTION_GROUPS.items():
        print(f"Section {prefix}: {data['title']}")
        print(f"Questions: {len(data['questions'])}")

    print(f"\nTotal questions processed: {total}")
    print("====================================")


seed_questions()
