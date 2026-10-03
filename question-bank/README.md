# BUET ME L-4 past questions: index (START HERE)

> Transcribed from scanned BUET exam papers (text only). The page images (`pages/`), raw OCR (`raw/`) and the original PDFs are **not** part of this repository; wherever this index mentions them, render the original PDF yourself if you have it. The transcription may contain OCR slips — check numbers against the source paper.


All 9 source PDFs are transcribed to Markdown in `papers/`. **Read these files.**
Each paper file: header, then one `# ME xxx` section per course, with all questions, marks, LaTeX equations, tables, figure descriptions, `pN` page tags, and a Topics list at the end of each course.

## Files (`papers/`)
| File | Term / year | Courses inside |
|---|---|---|
| 2015-2016_L4T1_ME.md | L-4/T-1, 2015-16 | ME 401 (IC Engines), ME 445, ME 441, ME 415, ME 421, IPE 431 |
| 2016-2017_L4T1_ME.md | L-4/T-1, 2016-17 | ME 401, ME 421, ME 415, ME 467, ME 461, ME 445, ME 441, IPE 431 |
| 2017-2018_L4T1_ME.md | L-4/T-1, 2017-18 (scanned PDF) | ME 417, ME 421, ME 415, ME 467, ME 445, ME 441, IPE 431 |
| 2018-2019_L4T1_ME.md | L-4/T-1, 2018-19 | ME 415, 417, 421, 423, IPE 431, 441, 445, 467 |
| 2020-2021_L4T1_ME.md | L-4/T-1, 2020-21 | ME 415, 417, 421, 423, 441, 445, 467, IPE 431 |
| 2020-2021_L4T2_ME.md | L-4/T-2, 2020-21 | ME 407, 413, 419, 427, 433, 449, 461, 469, 475, IPE 481 |
| 2021-2022_L4T1_ME.md | L-4/T-1, 2021-22 | ME 415, 417, 421, 441, 445, 463, 467, IPE 431 |
| 2022-2023_L4T1_ME.md | L-4/T-1, 2022-23 | ME 415, 417, 421, 441, 445, 463 |
| undated_L4T1_ME.md | `L-4,T-1.pdf` (scanned); headers say 2023-24 session, exams dated 25/08/2025 to 17/09/2025 | ME 415, 417, 421, 441, 445, 467, IPE 431 |

Source PDF to file mapping: `ME-L-4,T-1 (2015-2016) .pdf`, `ME L-4,T-1 (2016-2017).pdf`, `ME L-4,T-1(2017-2018) (1).pdf`, `L-4,T-1,ME, 2018-2019.pdf`, `L-4T-1, ME, 2020-2021.pdf`, `L-4T-2,ME, 2020-2021.pdf`, `L-4 T-1, ME, 2021-2022.pdf`, `L-4 T-1,ME, 2022-2023.pdf`, `L-4,T-1.pdf`.

## Course to years (for finding repeated questions across years)
- ME 401 / 417 Internal Combustion Engines: 2015-16 (401), 2016-17 (401), 2017-18, 2018-19, 2020-21, 2021-22, 2022-23, undated
- ME 415 Refrigeration & Building Mech. Systems: all T-1 files
- ME 421 Fluid Machinery: all T-1 files
- ME 441 Theory of Structures: all T-1 files
- ME 445 Noise & Vibration: all T-1 files
- ME 467 Automobile Engineering: 2016-17, 2017-18, 2018-19, 2020-21, 2021-22, undated
- IPE 431 Machine Tools: 2015-16 to 2021-22, undated
- ME 423 Fluids Engineering: 2018-19, 2020-21
- ME 463 Petroleum Engineering: 2021-22, 2022-23
- ME 461 Control Engineering: 2016-17 (T-1 file), 2020-21 (T-2 file)
- L-4/T-2 courses (ME 407, 413, 419, 427, 433, 449, 469, 475, IPE 481): 2020-21 T-2 file only

Handy search: `grep -n "^# ME 415" papers/*.md`, or search the "Topics" lines for a topic keyword.

## Known gaps / caveats
- ME 445 in 2018-19: the PDF has only pages 1-2, so Q6(b), Q7, Q8 are missing from the source.
- IPE 431 in 2020-21: only Section A (the "Contd" page is missing from the scan).
- ME 407 steam/ideal-gas tables (2020-21 T-2, pp7-17) are summarised, not reproduced number by number.
- Charts (ME 415 C1/C2 elevator trip-time charts, pump curves, some circuits and figure labels) are described in words only. Unreadable bits are marked `[illegible]`. For those, look at the original PDF page (not bundled): it can be rendered at higher dpi with `pdftoppm -r 130 -f N -l N -png <pdf> out`.
- A few numbering quirks are kept as printed (duplicate "(a)", "(d)", etc.); the paper files note them.
- The text was transcribed from OCR plus page images, so formulas may contain small errors. Check against the page image if a number looks wrong.

## Other folders
- (`raw/` and `pages/` of the original working copy are not bundled.)
