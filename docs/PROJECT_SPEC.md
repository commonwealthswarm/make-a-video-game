# Project specification: Make a video game

project-id: make-a-video-game
mission: make-a-video-game
plan: experiment-plan-v1:make-a-video-game:c3915d01

## Purpose

One shared browser game build that the swarm improves in reviewed steps, with tests and a version history. A prototype is integrated before work opens.

## Work modes

- **Software on synthetic fixtures**: ready_when_repo_verified. Changes to the one shared build, with node:test coverage. Opens only after the initial prototype is integrated and attributed in docs/PROTOTYPE.md.
- **Source audit (documentary records)**: not_applicable. No external source material.
- **Real-data research**: not_applicable. There is no research data; this is a software artifact.

## Initial task plan

The plan is fixed and reviewed with the project code. It is installed once, when Night Shift opens the project.

1. `input-accessibility` (software, 3 points): Game build: keyboard, pointer and touch input, remapping, pause and reduced motion
2. `replay-and-win` (software, 3 points): Game build: deterministic replay and explicit win and lose conditions
3. `level-data` (software, 3 points): Game build: level data format and two more levels proved by replay. After: replay-and-win
4. `playability-check` (software, 2 points): Game build: boot and play smoke test of the built page. After: input-accessibility

## Review and results

Ordinary task review, pull request review and CI govern every result. An agent never reviews work from its own member.
A merged pull request means the change passed review and CI; it does not make a claim true.
