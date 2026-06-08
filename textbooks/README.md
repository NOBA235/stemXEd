# Content Sources for Solvr RAG Knowledge Base

## Free & Legal Sources (Start Here)

### NCERT (India — your primary market)
All NCERT textbooks are FREE and openly licensed for educational use.
Download from: https://ncert.nic.in/textbook.php

Priority downloads:
- Physics Part I & II — Class 11 and 12
- Mathematics — Class 11 and 12
- Chemistry Part I & II — Class 11 and 12
- Biology — Class 11 and 12
- Science — Class 9 and 10 (covers younger students too)

### OpenStax (US — for international students)
Free, peer-reviewed, openly licensed college textbooks.
Download from: https://openstax.org/subjects

Priority:
- College Physics (AP/university level)
- University Physics (2 volumes)
- Calculus (Volumes 1, 2, 3)
- Chemistry 2e
- Biology 2e
- Precalculus

### Khan Academy Content
Not PDFs, but you can use their article text.
Most articles are CC-licensed: https://www.khanacademy.org

### MIT OpenCourseWare
Free lecture notes from MIT courses — excellent for advanced students.
https://ocw.mit.edu — filter by Physics, Mathematics, Chemistry

### Brilliant.org Problem Sets
NOT free — skip these.

## Worked Examples to Add (High Value)

Beyond textbooks, worked examples dramatically improve RAG quality.
Create a folder: textbooks/worked-examples/

Format as plain text files like:
```
Topic: Newton's Second Law
Difficulty: Medium
Curriculum: NCERT, AP, IGCSE

PROBLEM: A 5kg block is pushed with a force of 20N on a frictionless surface.
Find the acceleration.

SOLUTION:
Given: mass m = 5 kg, force F = 20 N, friction = 0
Find: acceleration a

Using Newton's Second Law: F = ma
Rearranging: a = F/m
Substituting: a = 20/5
Answer: a = 4 m/s²

Key insight: On a frictionless surface, ALL the force goes into acceleration.
```

Create 50-100 of these per subject. They're short, highly relevant,
and dramatically improve solution quality.

## Formula Sheets (Add These First — Highest ROI)

Create textbooks/formulas/ with plain text formula sheets:

physics_formulas.txt:
  Newton's Second Law: F = ma
  Kinematic equations: v = u + at, s = ut + ½at², v² = u² + 2as
  Momentum: p = mv
  Work: W = Fd cos θ
  Kinetic energy: KE = ½mv²
  Potential energy: PE = mgh
  Power: P = W/t = Fv
  Pressure: P = F/A
  Ohm's Law: V = IR
  ... (add all curriculum formulas)

## File Organisation

Create this structure:
textbooks/
  ncert/
    physics-class11-part1.pdf
    physics-class11-part2.pdf
    physics-class12-part1.pdf
    physics-class12-part2.pdf
    mathematics-class11.pdf
    mathematics-class12.pdf
    chemistry-class11-part1.pdf
    chemistry-class11-part2.pdf
    chemistry-class12-part1.pdf
    chemistry-class12-part2.pdf
    biology-class11.pdf
    biology-class12.pdf
  openstax/
    college-physics.pdf
    calculus-vol1.pdf
    chemistry-2e.pdf
    biology-2e.pdf
  worked-examples/
    physics-mechanics.txt
    physics-electricity.txt
    mathematics-calculus.txt
    mathematics-algebra.txt
    chemistry-reactions.txt
    biology-cells.txt
  formulas/
    physics-formulas.txt
    mathematics-formulas.txt
    chemistry-formulas.txt
    biology-formulas.txt

## Copyright Note

NCERT and OpenStax content is explicitly free for educational use.
MIT OCW is CC-licensed.
Do NOT ingest: Pearson, Cambridge, Oxford, or any paid publisher content.
Do NOT ingest: Any content you don't have a license for.
