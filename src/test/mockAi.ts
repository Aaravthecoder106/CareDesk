import { AIAnalysisResult } from "../types";

export const mockAnalysisResult: AIAnalysisResult = {
  summary: "Mock analysis: This is a simulated summary of the medical report contents. The report shows values within and outside normal ranges.",
  metrics: [
    {
      metricName: "HbA1c",
      value: 7.2,
      unit: "%",
      normalRangeLow: 4.0,
      normalRangeHigh: 5.6,
      isAbnormal: true,
    },
    {
      metricName: "Fasting Glucose",
      value: 126,
      unit: "mg/dL",
      normalRangeLow: 70,
      normalRangeHigh: 100,
      isAbnormal: true,
    },
    {
      metricName: "Total Cholesterol",
      value: 195,
      unit: "mg/dL",
      normalRangeLow: 125,
      normalRangeHigh: 200,
      isAbnormal: false,
    },
  ],
  anomalies: ["HbA1c elevated at 7.2% (target < 7%)", "Fasting glucose elevated at 126 mg/dL"],
};

export const mockQuestions: string[] = [
  "What could be causing my chest pain?",
  "Are there any lifestyle changes I should make?",
  "Should I adjust my current medications?",
  "What follow-up tests do I need?",
  "How often should I schedule visits going forward?",
];

export const mockSummary = "## Visit Summary\n\n**Key Findings:** Based on the doctor's notes, the visit covered important health topics.\n\n**Treatment Plan:** Treatment adjustments recommended.\n\n**Medications:** Current medications reviewed.\n\n**Follow-up:** Follow-up appointment in 3 months.";

export const mockAIResponse = JSON.stringify(mockAnalysisResult);
export const mockQuestionsResponse = JSON.stringify(mockQuestions);
export const mockSummaryResponse = mockSummary;
