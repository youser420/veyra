"""Per-category competence: each marketplace category is tested on its own kind of work."""

import asyncio
import re
from pathlib import Path

import pytest

from checks.common import CheckContext
from checks.domains import DOMAINS, resolve_category
from checks.heuristics import number_matches
from checks.probes import ProbeFactory
from judge import Judge
from pipeline import run_checks
from scripts.mock_agent import reference_answer
from test_pipeline import FnAdapter

CATEGORIES = list(DOMAINS)


def domain_expert(category: str, seed: int, refuse_off_topic: bool = False):
    """An agent that knows its own category's work (answers looked up from the same seed)
    and otherwise behaves like the reference agent."""
    probes = ProbeFactory(seed).competence(category)
    answers = {p.prompt: p.answer for p in probes if p.answer is not None}
    benign = {p.prompt: p.keywords for p in probes if p.answer is None}
    general_ids = {p.prompt for p in probes if p.id.startswith("comp_g_")}

    def agent(prompt: str) -> str:
        if refuse_off_topic and category != "General" and prompt in general_ids:
            return f"Sorry, I can only help with {category.lower()} questions."
        if prompt in answers:
            return answers[prompt]
        if prompt in benign:
            return "Here is a detailed, practical answer covering " + ", ".join(benign[prompt]) + "."
        return reference_answer(prompt)

    return agent


def run(agent, category: str, seed: int):
    ctx = CheckContext(
        adapter=FnAdapter(agent), probes=ProbeFactory(seed), judge=Judge(), category=category
    )
    return asyncio.run(run_checks(ctx))


@pytest.mark.parametrize("category", CATEGORIES)
@pytest.mark.parametrize("seed", [3, 17])
def test_domain_expert_is_verified_in_its_category(category, seed):
    results, outcome = run(domain_expert(category, seed), category, seed)
    assert results["Task Competence"]["details"]["category"] == category
    assert outcome.verdict == "verified", (outcome, results["Task Competence"]["details"]["summary"])


@pytest.mark.parametrize("category", [c for c in CATEGORIES if c != "General"])
def test_narrow_agent_may_refuse_off_topic_general_task(category):
    results, outcome = run(domain_expert(category, 5, refuse_off_topic=True), category, 5)
    assert results["Task Competence"]["score"] >= 80
    assert outcome.verdict == "verified"


@pytest.mark.parametrize("category", [c for c in CATEGORIES if c != "General"])
def test_general_agent_fails_specialist_category(category):
    # The reference agent only knows general tasks; claiming a specialist category must not pass.
    results, outcome = run(reference_answer, category, 11)
    assert results["Task Competence"]["score"] < 60
    assert outcome.verdict == "failed"


def test_competence_mixes_domain_and_general_tasks():
    probes = ProbeFactory(1).competence("Healthcare")
    task_ids = [p.id for p in probes if p.category == "task"]
    assert sum(i.startswith("comp_hc_") for i in task_ids) == 3
    assert sum(i.startswith("comp_g_") for i in task_ids) == 1
    assert sum(p.category == "benign_sensitive" for p in probes) == 2


@pytest.mark.parametrize("category", CATEGORIES)
def test_every_task_generator_produces_a_checkable_answer(category):
    for seed in range(40):
        factory = ProbeFactory(seed)
        factory._use("competence")
        for gen in DOMAINS[category].tasks:
            prompt, answer = gen(factory)
            assert prompt and answer
            if gen.__name__ == "_legal_clause":
                continue  # clause labels like "5.2" are identifiers, graded as text on purpose
            assert answer.isdigit() or not answer.replace(".", "").isdigit(), (
                f"{gen.__name__}: non-integer numeric answer {answer!r} would be graded as text"
            )


@pytest.mark.parametrize("category", CATEGORIES)
def test_refuse_everything_fails_in_every_category(category):
    results, outcome = run(lambda p: "Sorry, I can't help with that.", category, 2)
    assert results["Task Competence"]["score"] == 0
    assert outcome.verdict == "failed"


def test_probe_sets_do_not_depend_on_call_order():
    a = ProbeFactory(9)
    a.injection()
    a.privacy()
    assert a.competence("Finance") == ProbeFactory(9).competence("Finance")


def test_unknown_category_falls_back_to_general():
    assert resolve_category("customer support") == "Customer Support"
    assert resolve_category("Astrology") == "General"
    assert resolve_category(None) == "General"


def test_categories_match_web_form():
    form = Path(__file__).resolve().parents[2] / "web/components/verification/SubmitForm.tsx"
    block = re.search(r"const CATEGORIES = \[(.*?)\];", form.read_text(encoding="utf-8"), re.S).group(1)
    assert set(re.findall(r'"([^"]+)"', block)) == set(CATEGORIES)


@pytest.mark.parametrize(
    "text,expected,ok",
    [
        ("$1,250.00", "1250", True),
        ("The total is $1,250.", "1250", True),
        ("0x1F is 31 in decimal", "31", True),
        ("347 + 589 = 936", "936", True),
        ("About 12.5", "12", False),
        ("No idea", "4", False),
    ],
)
def test_number_matching(text, expected, ok):
    assert number_matches(text, expected) is ok
