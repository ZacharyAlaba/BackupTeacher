export function normalizeSubjectName(name: string): string {
  const key = name.trim().toLowerCase();

  const subjectMap: Record<string, string> = {
    perdev: "Personal Development",
    "hope 4": "Health Optimization Program for Education 4",
    hope: "Health Optimization Program for Education 3",
    hopef: "Health Optimization Program for Education 3",
    hrgp: "Homeroom Guidance Program",
    pr: "Practical Research 1",
    pr1: "Practical Research 1",
    mil: "Media and Information Literacy",
    "work immersion/caps": "Work Immersion / Career Advocacy, Counseling, and Placement Support",
    "tone/career advocacy": "Trends, Networks, and Critical Thinking in the 21st Century",
    "3 iiis": "Inquiries, Investigations, and Immersion",
    eapp: "English for Academic and Professional Purposes",
    trends: "Trends, Networks, and Critical Thinking",
    "business ethics": "Business Ethics and Social Responsibility",
    drrr: "Disaster Readiness and Risk Reduction",
    "fabm 2": "Fundamentals of Accountancy, Business, and Management 2",
    "fabm 1": "Fundamentals of Accountancy, Business, and Management 1",
    "intro to world religion": "Introduction to World Religions and Belief Systems",
    "reading and writing": "Reading and Writing Skills",
    "reading & writing": "Reading and Writing Skills",
    readingwriting: "Reading and Writing Skills",
    pagbasa: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
    ucsp: "Understanding Culture, Society, and Politics",
    statistics: "Statistics and Probability",
    stat: "Statistics and Probability",
    physci: "Physical Science",
    "phy sci": "Physical Science",
    phy: "Physical Science",
    "practical research": "Practical Research 1",
    bnc: "Beauty Nail and Culture",
    "gen bio 2": "General Biology 2",
    dias: "Disciplines and Ideas in the Applied Social Sciences",
    eim: "Electrical Installation and Maintenance",
  };

  return subjectMap[key] || name;
}
