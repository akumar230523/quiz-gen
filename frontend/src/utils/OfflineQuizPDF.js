/**
 * OfflineQuizPDF.js  -  Standard Examination Paper PDF Generator
 */

import { jsPDF } from "jspdf";

// ---------------------------------------------------------------------------
// Page geometry  (all values in mm)
// ---------------------------------------------------------------------------
const PW = 210;          // A4 width
const PH = 297;          // A4 height
const ML = 20;           // left margin
const MR = 20;           // right margin
const CW = PW - ML - MR; // content width = 170 mm

// Vertical zones
const COVER_HDR_H = 92;   // height of cover header block (page 1)
const PAGE_HDR_H = 18;   // running header height on question pages
const PAGE_FTR_H = 14;   // footer height (all pages)
const COVER_BODY_Y = COVER_HDR_H + 8;   // y where instructions start (page 1)
const Q_PAGE_BODY_Y = PAGE_HDR_H + 6;   // y where content starts on Q pages
const BODY_BOTTOM = PH - PAGE_FTR_H - 6; // max y before footer

// ---------------------------------------------------------------------------
// Greyscale palette  [R, G, B]
// ---------------------------------------------------------------------------
const C = {
    BLACK: [0, 0, 0],
    WHITE: [255, 255, 255],
    G15: [38, 38, 38],  // near-black text
    G35: [89, 89, 89],  // dark grey
    G55: [140, 140, 140],  // mid grey
    G75: [191, 191, 191],  // light grey rule
    G90: [230, 230, 230],  // very light grey fill
    G96: [245, 245, 245],  // near-white fill / alt row
};

// ---------------------------------------------------------------------------
// Font sizes  (pt)
// ---------------------------------------------------------------------------
const F = {
    INST: 13,   // institution name
    EXAM: 11,   // exam title
    META_L: 7,   // metadata label
    META_V: 9,   // metadata value
    INSTR: 8,   // instruction body
    SEC_HD: 9,   // section heading
    Q_NUM: 9,   // question number
    Q_TEXT: 10,   // question body text
    OPT: 9.5, // option text
    TOPIC: 6.5, // topic tag
    HDR: 8,   // running header
    FTR: 7,   // footer
    AK: 9,   // answer key cell
};

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Draw a solid horizontal rule. */
function hLine(doc, x, y, w, lw, color) {
    doc.setDrawColor(...(color || C.G75));
    doc.setLineWidth(lw || 0.3);
    doc.line(x, y, x + w, y);
}

/** Wrap text and return string[]. */
function wrap(doc, text, maxW) {
    return doc.splitTextToSize(String(text || ""), maxW);
}

/**
 * Estimate the rendered height (mm) of a text block.
 * lhPt is the leading in pt (defaults to fontSize * 1.25).
 */
function blockH(lines, fsPt, lhPt) {
    const lh = (lhPt || fsPt * 1.25) * 0.3528; // pt -> mm
    return lines.length * lh;
}

/** Draw a rectangle with optional fill and/or stroke. */
function rect(doc, x, y, w, h, fillColor, strokeColor, lw) {
    if (fillColor) doc.setFillColor(...fillColor);
    if (strokeColor) { doc.setDrawColor(...strokeColor); doc.setLineWidth(lw || 0.3); }
    const mode = fillColor && strokeColor ? "FD" : fillColor ? "F" : "S";
    doc.rect(x, y, w, h, mode);
}

/** English word for numbers 0-30 used in formal phrasing. */
function inWords(n) {
    const W = [
        "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen", "Twenty", "Twenty-One", "Twenty-Two", "Twenty-Three",
        "Twenty-Four", "Twenty-Five", "Twenty-Six", "Twenty-Seven", "Twenty-Eight",
        "Twenty-Nine", "Thirty",
    ];
    return n >= 0 && n <= 30 ? W[n] : String(n);
}

/** Format today's date as "15 April 2026". */
function todayStr() {
    return new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

// ---------------------------------------------------------------------------
// COVER HEADER  (page 1 only)
// Draws the full institution + exam identity + metadata block.
// Returns nothing; the block always occupies exactly COVER_HDR_H mm.
// ---------------------------------------------------------------------------
function drawCoverHeader(doc, quizData, isAnswerKey) {
    const qCount = (quizData.questions || []).length;
    const marks = quizData.total_marks || qCount;
    const timeMins = Math.max(30, qCount * 2);
    const date = todayStr();
    const code = (quizData.quiz_code || "------").toUpperCase();

    const TOP = 6;   // top of the cover block

    // --- Outer border (double rule) -----------------------------------------
    doc.setDrawColor(...C.BLACK);
    doc.setLineWidth(1.4);
    doc.rect(ML, TOP, CW, COVER_HDR_H, "S");
    doc.setLineWidth(0.35);
    doc.rect(ML + 2, TOP + 2, CW - 4, COVER_HDR_H - 4, "S");

    // --- Logo box (top-left) ------------------------------------------------
    const LG = { x: ML + 5, y: TOP + 6, s: 16 };
    rect(doc, LG.x, LG.y, LG.s, LG.s, C.G96, C.G35, 0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.G55);
    doc.text("LOGO", LG.x + LG.s / 2, LG.y + LG.s / 2 + 2, { align: "center" });

    // --- Institution name ---------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.INST);
    doc.setTextColor(...C.BLACK);
    doc.text("QuizGen Assessment Centre", PW / 2, TOP + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.META_L + 0.5);
    doc.setTextColor(...C.G35);
    doc.text(
        "AI-Powered Adaptive Learning & Assessment Platform",
        PW / 2, TOP + 16, { align: "center" }
    );

    hLine(doc, ML + 5, TOP + 20, CW - 10, 0.4, C.G55);

    // --- Exam title ---------------------------------------------------------
    const examName = (quizData.exam_name || "Offline Quiz").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.EXAM + 1);
    doc.setTextColor(...C.BLACK);
    doc.text(examName, PW / 2, TOP + 27, { align: "center" });

    if (isAnswerKey) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...C.G35);
        doc.text(
            "ANSWER KEY  -  FOR EXAMINER / TEACHER USE ONLY",
            PW / 2, TOP + 33, { align: "center" }
        );
    }

    // --- Metadata strip (5 columns) -----------------------------------------
    const STRIP_Y = TOP + 37;
    hLine(doc, ML + 4, STRIP_Y, CW - 8, 0.3, C.G90);

    const metaCols = [
        { label: "DATE", value: date },
        { label: "TIME ALLOWED", value: timeMins + " Min" },
        { label: "MAXIMUM MARKS", value: String(marks) },
        { label: "TOTAL QUESTIONS", value: String(qCount) },
        { label: "QUIZ CODE", value: code },
    ];
    const mW = (CW - 8) / metaCols.length;

    metaCols.forEach((m, i) => {
        const mx = ML + 4 + i * mW + mW / 2;

        // Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(F.META_L);
        doc.setTextColor(...C.G55);
        doc.text(m.label, mx, STRIP_Y + 6, { align: "center" });

        // Value
        doc.setFont("helvetica", "bold");
        doc.setFontSize(F.META_V);
        doc.setTextColor(...C.BLACK);
        doc.text(m.value, mx, STRIP_Y + 12, { align: "center" });

        // Vertical divider between cells
        if (i < metaCols.length - 1) {
            hLine(doc, ML + 4 + (i + 1) * mW, STRIP_Y + 2,
                0 /* width=0 for vertical line hack */, 0.2, C.G90);
            doc.setDrawColor(...C.G90);
            doc.setLineWidth(0.2);
            doc.line(
                ML + 4 + (i + 1) * mW, STRIP_Y + 2,
                ML + 4 + (i + 1) * mW, STRIP_Y + 14
            );
        }
    });

    hLine(doc, ML + 4, STRIP_Y + 15, CW - 8, 0.3, C.G90);

    // --- Student information fields -----------------------------------------
    const INFO_Y = STRIP_Y + 20;

    // Serial number box  (right)
    const SN_W = 44;
    const SN_X = ML + CW - SN_W - 4;
    rect(doc, SN_X, INFO_Y - 2, SN_W, 24, C.G96, C.G35, 0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.META_L);
    doc.setTextColor(...C.G55);
    doc.text("SERIAL No. / ROLL No.", SN_X + SN_W / 2, INFO_Y + 3, { align: "center" });
    hLine(doc, SN_X + 2, INFO_Y + 5, SN_W - 4, 0.25, C.G75);
    if (quizData.student_name) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...C.BLACK);
        doc.text(quizData.student_name, SN_X + SN_W / 2, INFO_Y + 13, { align: "center" });
    }

    // Name / Subject / Signature lines  (left of serial box)
    const LINE_RIGHT = SN_X - 6;
    const LINE_W = LINE_RIGHT - ML - 50;

    const fields = [
        { label: "Candidate's Name:", labelW: 44, y: INFO_Y + 4 },
        { label: "Subject / Test:", labelW: 34, y: INFO_Y + 11 },
        { label: "Candidate's Signature:", labelW: 52, y: INFO_Y + 18 },
        {
            label: "Invigilator's Signature:", labelW: 54, y: INFO_Y + 18,
            x2: ML + CW / 2
        },
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.META_L + 0.5);
    doc.setTextColor(...C.G35);

    // Row 1: Name
    doc.text(fields[0].label, ML + 4, fields[0].y);
    if (quizData.student_name) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.BLACK);
        doc.text(quizData.student_name, ML + 4 + fields[0].labelW, fields[0].y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(F.META_L + 0.5);
        doc.setTextColor(...C.G35);
    } else {
        hLine(doc, ML + 4 + fields[0].labelW, fields[0].y + 0.5, LINE_RIGHT - ML - 4 - fields[0].labelW, 0.3, C.G35);
    }

    // Row 2: Subject
    doc.text(fields[1].label, ML + 4, fields[1].y);
    hLine(doc, ML + 4 + fields[1].labelW, fields[1].y + 0.5, LINE_RIGHT - ML - 4 - fields[1].labelW, 0.3, C.G35);

    // Row 3: Signatures (two on same line)
    doc.text("Candidate's Signature:", ML + 4, fields[2].y);
    hLine(doc, ML + 4 + 52, fields[2].y + 0.5, (SN_X - ML) / 2 - 60, 0.3, C.G35);
    doc.text("Invigilator's Signature:", ML + CW / 2 - 6, fields[3].y);
    hLine(doc, ML + CW / 2 - 6 + 54, fields[3].y + 0.5, SN_X - (ML + CW / 2 - 6 + 56), 0.3, C.G35);

    // Date line bottom
    const DL_Y = INFO_Y + 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.META_L);
    doc.setTextColor(...C.G35);
    doc.text("Date of Exam: " + date, ML + 4, DL_Y);

    // --- Bottom banner ------------------------------------------------------
    const BAN_Y = TOP + COVER_HDR_H - 9;
    rect(doc, ML + 4, BAN_Y, CW - 8, 7.5, C.BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.WHITE);

    if (isAnswerKey) {
        doc.text(
            "CONFIDENTIAL  -  ANSWER KEY  -  DO NOT DISTRIBUTE TO CANDIDATES",
            PW / 2, BAN_Y + 5, { align: "center" }
        );
    } else {
        doc.text(
            "DO NOT OPEN THIS QUESTION BOOKLET UNTIL YOU ARE ASKED TO DO SO",
            PW / 2, BAN_Y + 5, { align: "center" }
        );
    }
}

// ---------------------------------------------------------------------------
// GENERAL INSTRUCTIONS  (page 1, below cover header)
// Returns: y position after the block.
// ---------------------------------------------------------------------------
function drawInstructions(doc, startY, quizData) {
    const qCount = (quizData.questions || []).length;
    const marks = quizData.total_marks || qCount;
    const timeMins = Math.max(30, qCount * 2);

    const rules = [
        `This Question Booklet contains ${qCount} (${inWords(qCount)}) questions. ` +
        "All questions are compulsory.",
        `The Test is of ${timeMins} (${inWords(timeMins)}) minutes duration. ` +
        `Maximum Marks: ${marks} (${inWords(marks)}).`,
        "Each correct answer carries ONE (1) mark. " +
        "There is NO negative marking for wrong answers.",
        "For each question, four options (A), (B), (C), (D) are given. " +
        "Select the ONE correct or most appropriate answer.",
        "Darken the circle completely using a dark blue / black ballpoint pen " +
        "in the OMR Answer Sheet. Do NOT use pencil.",
        "Do NOT make stray marks on the Answer Sheet. " +
        "Erasing or whitening the OMR bubbles is NOT permitted.",
        "Rough work may only be done in the ROUGH WORK space at the end " +
        "of this booklet. Do NOT write answers there.",
        "Mobile phones, electronic calculators, pagers, or any other " +
        "electronic device are STRICTLY prohibited in the hall.",
        "Candidates must return the Question Booklet and Answer Sheet " +
        "to the invigilator before leaving the examination hall.",
    ];

    let y = startY;

    // Heading bar
    rect(doc, ML, y, CW, 8, C.G15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.SEC_HD);
    doc.setTextColor(...C.WHITE);
    doc.text("GENERAL INSTRUCTIONS", PW / 2, y + 5.5, { align: "center" });
    y += 9;

    // Rule rows
    rules.forEach((rule, i) => {
        const lines = wrap(doc, rule, CW - 14);
        const LH_MM = F.INSTR * 0.3528 * 1.3;
        const rowH = Math.max(7, lines.length * LH_MM + 3.5);

        // Alternating row fill
        if (i % 2 === 1) {
            rect(doc, ML, y, CW, rowH, C.G96);
        }

        // Number badge  (filled circle via a square + text - avoids Unicode circle)
        rect(doc, ML + 3, y + rowH / 2 - 3, 5.5, 5.5, C.G35, null, 0);
        // Small white number inside
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.WHITE);
        doc.text(String(i + 1), ML + 3 + 2.75, y + rowH / 2 + 1, { align: "center" });

        // Rule text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(F.INSTR);
        doc.setTextColor(...C.G15);
        doc.text(lines, ML + 11, y + 4.5);

        y += rowH;
    });

    // Border around entire instructions block
    doc.setDrawColor(...C.G35);
    doc.setLineWidth(0.4);
    doc.rect(ML, startY, CW, y - startY, "S");

    y += 3;

    // Tear / fold line  (dashes only - no Unicode scissors)
    doc.setDrawColor(...C.G55);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(ML, y + 4, PW - MR, y + 4);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.G55);
    doc.text("[ Fold / Tear Here ]", PW / 2, y + 8.5, { align: "center" });

    return y + 12;
}

// ---------------------------------------------------------------------------
// RUNNING HEADER  (appears on every question page)
// ---------------------------------------------------------------------------
function drawPageHeader(doc, quizData, isAnswerKey, pageNum) {
    // Thick top stripe
    rect(doc, 0, 0, PW, 3.5, C.G15);

    // Header band
    rect(doc, ML, 4.5, CW, PAGE_HDR_H - 3, C.G96, C.G75, 0.25);

    const midY = 4.5 + (PAGE_HDR_H - 3) / 2 + 2.5;

    // Left: exam name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.HDR);
    doc.setTextColor(...C.G15);
    doc.text(
        (quizData.exam_name || "EXAMINATION").toUpperCase(),
        ML + 3, midY
    );

    // Centre: page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.FTR);
    doc.setTextColor(...C.G55);
    doc.text("Page " + pageNum, PW / 2, midY, { align: "center" });

    // Right: code + copy type
    const label = isAnswerKey ? "ANSWER KEY" : "STUDENT COPY";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.FTR);
    doc.setTextColor(...C.G35);
    doc.text(
        (quizData.quiz_code || "") + "  |  " + label,
        PW - MR - 2, midY, { align: "right" }
    );
}

// ---------------------------------------------------------------------------
// RUNNING FOOTER  (every page, drawn in final post-pass)
// ---------------------------------------------------------------------------
function drawPageFooter(doc, pageNum, totalPages, quizData) {
    const FY = PH - PAGE_FTR_H + 2;

    hLine(doc, ML, FY, CW, 0.3, C.G75);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.FTR);
    doc.setTextColor(...C.G55);

    doc.text("CONFIDENTIAL", ML, FY + 5);
    doc.text(
        (quizData.exam_name || "Quiz") +
        "  |  Code: " + (quizData.quiz_code || "") +
        "  |  QuizGen Platform",
        PW / 2, FY + 5, { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.text(pageNum + " / " + totalPages, PW - MR, FY + 5, { align: "right" });
}

// ---------------------------------------------------------------------------
// SECTION HEADING BAR
// ---------------------------------------------------------------------------
function drawSectionHeading(doc, y, qCount, marks) {
    rect(doc, ML, y, CW, 8.5, C.G15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.SEC_HD);
    doc.setTextColor(...C.WHITE);
    const label =
        "SECTION A  -  MULTIPLE CHOICE QUESTIONS   " +
        "[" + qCount + " Questions x 1 Mark = " + marks + " Marks]";
    doc.text(label, ML + 4, y + 5.8);
    return y + 8.5 + 5;
}

// ---------------------------------------------------------------------------
// SINGLE QUESTION
// Draws one MCQ and returns the new y cursor.
// ---------------------------------------------------------------------------
function drawQuestion(doc, q, qNum, y, isAnswerKey) {
    const TEXT_X = ML + 10;   // question text left edge
    const TEXT_W = CW - 10;   // question text max width
    const OPT_X = ML + 8;    // option left edge
    const OPT_W = CW - 8;    // option max width
    const BUBBLE_W = 5.5;       // OMR circle diameter
    const OPT_GAP = 3;         // gap between bubble and text
    const opts = (q.options || []).slice(0, 4);
    const letters = ["A", "B", "C", "D"];

    // ------ Question number row --------------------------------------------
    // Number badge (solid dark square with white number)
    rect(doc, ML, y - 1, 8, 7, C.G15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.Q_NUM);
    doc.setTextColor(...C.WHITE);
    doc.text(String(qNum), ML + 4, y + 4.2, { align: "center" });

    // Marks  [NM]  at right edge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.TOPIC);
    doc.setTextColor(...C.G55);
    const marksStr = "[" + (q.marks || 1) + "M]";
    doc.text(marksStr, PW - MR, y + 3, { align: "right" });

    // Topic tag (if present) - inline after question number badge
    if (q.topic) {
        const tagTxt = q.topic.length > 24 ? q.topic.slice(0, 23) + "." : q.topic;
        const tagW = Math.min(doc.getTextWidth(tagTxt) + 6, CW * 0.45);
        rect(doc, ML + 10, y - 1, tagW, 7, C.G96, C.G75, 0.2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(F.TOPIC);
        doc.setTextColor(...C.G35);
        doc.text(tagTxt, ML + 10 + tagW / 2, y + 4, { align: "center" });
        // Difficulty dot  (small right of topic tag)
        const diffFill = { easy: C.G75, medium: C.G35, hard: C.BLACK };
        const df = diffFill[(q.difficulty || "medium").toLowerCase()] || C.G35;
        rect(doc, ML + 10 + tagW + 3, y + 1.5, 4, 4, df);
        y += 9;
    } else {
        y += 9;
    }

    // ------ Question text --------------------------------------------------
    const qLines = wrap(doc, q.text || "", TEXT_W);
    const Q_LH = F.Q_TEXT * 0.3528 * 1.4;
    doc.setFont("times", "roman");
    doc.setFontSize(F.Q_TEXT);
    doc.setTextColor(...C.G15);
    doc.text(qLines, TEXT_X, y);
    y += qLines.length * Q_LH + 4;

    // ------ Options (2 per row, labelled A-D) ------------------------------
    // Layout: two options per row side by side
    const HALF_W = OPT_W / 2 - 4;
    const OPT_LH = F.OPT * 0.3528 * 1.35;

    for (let oi = 0; oi < opts.length; oi += 2) {
        // Measure heights of the two options in this row
        const linesL = wrap(doc, opts[oi] || "", HALF_W - BUBBLE_W - OPT_GAP - 1);
        const linesR = opts[oi + 1] !== undefined
            ? wrap(doc, opts[oi + 1], HALF_W - BUBBLE_W - OPT_GAP - 1)
            : [];
        const rowH = Math.max(linesL.length, linesR.length || 0) * OPT_LH + 3;

        // Left option
        _drawOption(doc, opts[oi], oi, y, OPT_X, HALF_W, isAnswerKey && oi === q.correctAnswer, letters[oi]);

        // Right option (if it exists)
        if (opts[oi + 1] !== undefined) {
            const RX = OPT_X + HALF_W + 8;
            _drawOption(doc, opts[oi + 1], oi + 1, y, RX, HALF_W, isAnswerKey && (oi + 1) === q.correctAnswer, letters[oi + 1]);
        }

        y += rowH + 1;
    }

    // ------ Separator line -------------------------------------------------
    y += 3;
    hLine(doc, ML, y, CW, 0.2, C.G90);
    y += 6;

    return y;
}

/** Draw a single option with OMR circle + text. */
function _drawOption(doc, text, optIdx, y, x, maxW, isCorrect, letter) {
    const CIRCLE_R = 2.6;   // radius in mm
    const CX = x + CIRCLE_R;
    const CY = y + CIRCLE_R;
    const textX = x + CIRCLE_R * 2 + 3;
    const textW = maxW - CIRCLE_R * 2 - 3;

    if (isCorrect) {
        // Filled circle  (answer key: correct answer highlighted)
        doc.setFillColor(...C.BLACK);
        doc.setDrawColor(...C.BLACK);
        doc.setLineWidth(0.3);
        doc.circle(CX, CY, CIRCLE_R, "FD");
        // White letter inside
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(...C.WHITE);
        doc.text(letter, CX, CY + 1.8, { align: "center" });
        // Bold text for correct option
        doc.setFont("times", "bold");
        doc.setFontSize(F.OPT);
        doc.setTextColor(...C.BLACK);
    } else {
        // Empty circle (student fills)
        doc.setFillColor(...C.WHITE);
        doc.setDrawColor(...C.G35);
        doc.setLineWidth(0.55);
        doc.circle(CX, CY, CIRCLE_R, "FD");
        // Dark letter inside empty circle
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(...C.G35);
        doc.text(letter, CX, CY + 1.8, { align: "center" });
        // Normal text
        doc.setFont("times", "roman");
        doc.setFontSize(F.OPT);
        doc.setTextColor(...C.G15);
    }

    const lines = wrap(doc, text, textW);
    doc.text(lines, textX, y + 2);
}

/** Estimate how many mm a question will occupy. */
function estimateQuestionH(doc, q) {
    const TEXT_W = CW - 10;
    const HALF_W = (CW - 8) / 2 - 4;
    const OPT_LH = F.OPT * 0.3528 * 1.35;
    const Q_LH = F.Q_TEXT * 0.3528 * 1.4;

    const qLines = wrap(doc, q.text || "", TEXT_W);
    const topicH = q.topic ? 9 : 9;
    const textH = qLines.length * Q_LH + 4;

    const opts = (q.options || []).slice(0, 4);
    let optH = 0;
    for (let oi = 0; oi < opts.length; oi += 2) {
        const lL = wrap(doc, opts[oi] || "", HALF_W - 8);
        const lR = opts[oi + 1] ? wrap(doc, opts[oi + 1], HALF_W - 8) : [];
        optH += Math.max(lL.length, lR.length || 0) * OPT_LH + 3 + 1;
    }

    return topicH + textH + optH + 3 + 6 + 2; // +separator+padding
}

// ---------------------------------------------------------------------------
// ANSWER KEY GRID  (teacher copy only)
// Compact 10-column table: Q number + filled bubble + letter
// ---------------------------------------------------------------------------
function drawAnswerKeyGrid(doc, questions, y) {
    const COLS = 10;
    const cellW = CW / COLS;
    const cellH = 10;

    // Header
    rect(doc, ML, y, CW, 9, C.G15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.SEC_HD);
    doc.setTextColor(...C.WHITE);
    doc.text(
        "ANSWER KEY SUMMARY  -  FOR EXAMINER / TEACHER USE ONLY",
        PW / 2, y + 6, { align: "center" }
    );
    y += 11;

    // Column header
    for (let c = 0; c < COLS; c++) {
        const cx = ML + c * cellW;
        rect(doc, cx, y, cellW, 6.5, C.G90, C.G75, 0.2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(...C.G55);
        doc.text("Q   Ans", cx + cellW / 2, y + 4.3, { align: "center" });
    }
    y += 7;

    // Data rows
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = ML + col * cellW;
        const cy = y + row * cellH;
        const ci = q.correctAnswer;
        const letter = ci >= 0 && ci < 4 ? String.fromCharCode(65 + ci) : "?";

        // Alternating row fill
        rect(doc, cx, cy, cellW, cellH, row % 2 === 0 ? C.WHITE : C.G96, C.G75, 0.18);

        // Q number  (small, grey, top-left)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...C.G55);
        doc.text("Q" + (i + 1), cx + 2, cy + 3.8);

        // Filled bubble with answer letter (centre of cell)
        doc.setFillColor(...C.BLACK);
        doc.setDrawColor(...C.BLACK);
        doc.setLineWidth(0.25);
        doc.circle(cx + cellW / 2, cy + 6, 2.8, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.WHITE);
        doc.text(letter, cx + cellW / 2, cy + 7.8, { align: "center" });
    }

    const rows = Math.ceil(questions.length / COLS);
    return y + rows * cellH + 8;
}

// ---------------------------------------------------------------------------
// ROUGH WORK SECTION  (student copy)
// ---------------------------------------------------------------------------
function drawRoughWork(doc, y) {
    const available = BODY_BOTTOM - y;
    if (available < 20) return;

    rect(doc, ML, y, CW, available, C.G96, C.G75, 0.3);

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.SEC_HD);
    doc.setTextColor(...C.G35);
    doc.text("ROUGH WORK  /  SPACE FOR CALCULATIONS", ML + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.G55);
    doc.text("(Space for rough work - do not write answers here)", ML + 5, y + 12);
    hLine(doc, ML + 4, y + 14, CW - 8, 0.25, C.G75);

    // Ruled lines
    doc.setDrawColor(...C.G75);
    doc.setLineWidth(0.15);
    for (let ly = y + 22; ly < y + available - 5; ly += 8) {
        doc.line(ML + 4, ly, ML + CW - 4, ly);
    }

    // Faint watermark text using multiple small chars (no special encoding)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(235, 235, 235);
    doc.text("ROUGH WORK", PW / 2, y + available / 2 + 6, { align: "center" });
}

// ---------------------------------------------------------------------------
// MAIN PDF BUILDER
// ---------------------------------------------------------------------------
function buildPDF(quizData, isAnswerKey) {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const questions = quizData.questions || [];
    const totalQ = questions.length;
    const totalM = quizData.total_marks ||
        questions.reduce((s, q) => s + (q.marks || 1), 0);

    doc.setProperties({
        title: (quizData.exam_name || "Quiz") + (isAnswerKey ? " - Answer Key" : " - Question Paper"),
        subject: quizData.exam_name || "Offline Quiz",
        author: "QuizGen Platform",
        creator: "QuizGen PDF Generator",
    });

    let pageNum = 1;

    // =========================================================================
    // PAGE 1  -  Cover header + General Instructions
    // =========================================================================
    drawCoverHeader(doc, quizData, isAnswerKey);

    let y = COVER_BODY_Y;
    y = drawInstructions(doc, y, quizData);

    // Footer placeholder on page 1 (redrawn in post-pass with correct total)
    drawPageFooter(doc, 1, 1, quizData);

    // =========================================================================
    // PAGE 2+  -  Questions
    // =========================================================================
    doc.addPage();
    pageNum = 2;
    drawPageHeader(doc, quizData, isAnswerKey, pageNum);

    y = drawSectionHeading(doc, Q_PAGE_BODY_Y, totalQ, totalM);

    function ensureSpace(needed) {
        if (y + needed > BODY_BOTTOM) {
            doc.addPage();
            pageNum++;
            drawPageHeader(doc, quizData, isAnswerKey, pageNum);
            y = Q_PAGE_BODY_Y;
        }
    }

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const needed = estimateQuestionH(doc, q);
        ensureSpace(needed);
        y = drawQuestion(doc, q, qNum, y, isAnswerKey);
    });

    // =========================================================================
    // Answer Key Grid  (teacher copy)
    // =========================================================================
    if (isAnswerKey) {
        const gridH = 11 + 7 + Math.ceil(totalQ / 10) * 10 + 10;
        ensureSpace(gridH);
        drawAnswerKeyGrid(doc, questions, y);
    }

    // =========================================================================
    // Rough Work  (student copy)
    // =========================================================================
    if (!isAnswerKey) {
        const roughAvail = BODY_BOTTOM - y;
        if (roughAvail < 30) {
            doc.addPage();
            pageNum++;
            drawPageHeader(doc, quizData, isAnswerKey, pageNum);
            y = Q_PAGE_BODY_Y;
        }
        drawRoughWork(doc, y);
    }

    // =========================================================================
    // POST-PASS  -  draw correct footer on every page
    // =========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageFooter(doc, p, totalPages, quizData);
    }

    return doc;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate and auto-download the student question paper.
 * @param {object} quizData  from POST /offline/generate
 */
export function generateQuizPDF(quizData) {
    const doc = buildPDF(quizData, false);
    const slug = (quizData.exam_name || "Quiz").replace(/\s+/g, "_");
    const code = (quizData.quiz_code || "QUIZ").toUpperCase();
    doc.save(slug + "_" + code + "_Question_Paper.pdf");
}

/**
 * Generate and auto-download the teacher answer key.
 * @param {object} quizData  from POST /offline/generate
 */
export function generateAnswerKeyPDF(quizData) {
    const doc = buildPDF(quizData, true);
    const slug = (quizData.exam_name || "Quiz").replace(/\s+/g, "_");
    const code = (quizData.quiz_code || "QUIZ").toUpperCase();
    doc.save(slug + "_" + code + "_Answer_Key.pdf");
}

/**
 * Return a jsPDF instance without saving (for preview / unit tests).
 * @param  {object}  quizData
 * @param  {boolean} isAnswerKey
 * @returns {jsPDF}
 */
export function buildQuizDoc(quizData, isAnswerKey = false) {
    return buildPDF(quizData, isAnswerKey);
}