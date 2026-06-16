export const MIN_PATIENT_AGE = 20;
export const MAX_PATIENT_AGE = 79;

export const DEGREE_OPTIONS = [
  'No High School',
  'High School Diploma',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate / Professional',
] as const;

export type DegreeOption = (typeof DEGREE_OPTIONS)[number];

export type MajorSchoolGroup = {
  readonly school: string;
  readonly majors: readonly string[];
};

export const MAJOR_SCHOOL_GROUPS: readonly MajorSchoolGroup[] = [
  {
    school: 'Engineering',
    majors: [
      'Computer Engineering',
      'Software Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Biomedical Engineering',
      'Chemical Engineering',
      'Aerospace Engineering',
      'Industrial Engineering',
      'Mechatronics Engineering',
    ],
  },
  {
    school: 'Computer & Technology',
    majors: [
      'Computer Science',
      'Information Technology',
      'Information Systems',
      'Cybersecurity',
      'Data Science',
      'Artificial Intelligence',
      'Bioinformatics',
      'Game Development',
      'Computer Graphics',
      'Human-Computer Interaction',
    ],
  },
  {
    school: 'Health & Medical Sciences',
    majors: [
      'Medicine',
      'Dentistry',
      'Pharmacy',
      'Nursing',
      'Physical Therapy',
      'Biomedical Informatics',
      'Public Health',
      'Medical Laboratory Science',
      'Radiologic Technology',
      'Nutrition and Dietetics',
    ],
  },
  {
    school: 'Natural Sciences',
    majors: [
      'Biology',
      'Chemistry',
      'Physics',
      'Mathematics',
      'Statistics',
      'Environmental Science',
      'Geology',
      'Astronomy',
      'Biotechnology',
    ],
  },
  {
    school: 'Business & Economics',
    majors: [
      'Business Administration',
      'Accounting',
      'Finance',
      'Economics',
      'Marketing',
      'Human Resource Management',
      'International Business',
      'Supply Chain Management',
      'Entrepreneurship',
    ],
  },
  {
    school: 'Social Sciences',
    majors: [
      'Psychology',
      'Sociology',
      'Political Science',
      'Anthropology',
      'Criminology',
      'International Relations',
      'Geography',
      'Social Work',
    ],
  },
  {
    school: 'Arts & Humanities',
    majors: [
      'English Literature',
      'History',
      'Philosophy',
      'Linguistics',
      'Creative Writing',
      'Religious Studies',
      'Archaeology',
      'Fine Arts',
      'Music',
    ],
  },
  {
    school: 'Education',
    majors: [
      'Early Childhood Education',
      'Elementary Education',
      'Secondary Education',
      'Special Education',
      'Educational Technology',
    ],
  },
  {
    school: 'Media & Communication',
    majors: [
      'Journalism',
      'Mass Communication',
      'Public Relations',
      'Advertising',
      'Digital Media',
      'Film Studies',
    ],
  },
  {
    school: 'Law & Public Service',
    majors: ['Law', 'Legal Studies', 'Public Administration', 'Public Policy'],
  },
  {
    school: 'Agriculture & Environment',
    majors: [
      'Agriculture',
      'Agribusiness',
      'Forestry',
      'Animal Science',
      'Food Science',
      'Environmental Engineering',
    ],
  },
  {
    school: 'Design & Architecture',
    majors: [
      'Architecture',
      'Interior Design',
      'Graphic Design',
      'Industrial Design',
      'Urban Planning',
    ],
  },
  {
    school: 'Emerging & Interdisciplinary',
    majors: [
      'Computational Biology',
      'Cognitive Science',
      'Robotics',
      'Health Information Management',
      'Digital Health',
      'Sustainability Studies',
      'Computational Neuroscience',
    ],
  },
  {
    school: 'Other',
    majors: ['Undeclared'],
  },
] as const;

export const MAJOR_OPTIONS = MAJOR_SCHOOL_GROUPS.flatMap((group) => group.majors);

export const LOW_EDUCATION_MAJOR_GROUPS: readonly MajorSchoolGroup[] = [
  {
    school: 'Vocational & Trade',
    majors: [
      'Automotive Technology',
      'Construction Trades',
      'Cosmetology',
      'Culinary Arts',
      'Dental Assisting',
      'Electrical Technology',
      'HVAC & Refrigeration',
      'Medical Assisting',
      'Plumbing',
      'Welding',
    ],
  },
  {
    school: 'Other',
    majors: ['General Studies', 'Undeclared'],
  },
] as const;

export const LOW_EDUCATION_MAJORS = LOW_EDUCATION_MAJOR_GROUPS.flatMap((group) => group.majors);

export type MajorOption = (typeof MAJOR_OPTIONS)[number] | (typeof LOW_EDUCATION_MAJORS)[number];

export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDobBounds(): { min: Date; max: Date } {
  const max = new Date();
  max.setHours(12, 0, 0, 0);

  const min = new Date(max);
  min.setFullYear(min.getFullYear() - MAX_PATIENT_AGE);

  return { min, max };
}

export function calculateAgeFromIso(isoDate: string): number | null {
  const dob = parseIsoDate(isoDate);
  if (!dob) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function validateDateOfBirth(isoDate: string): string | null {
  const dob = parseIsoDate(isoDate);
  if (!dob) {
    return 'Please enter a valid calendar date.';
  }

  const { min, max } = getDobBounds();
  if (dob > max) {
    return 'Date of birth cannot be in the future.';
  }
  if (dob < min) {
    return `Date of birth must be within the last ${MAX_PATIENT_AGE} years.`;
  }

  const age = calculateAgeFromIso(isoDate);
  if (age == null) {
    return 'Please enter a valid date of birth.';
  }
  if (age < MIN_PATIENT_AGE || age > MAX_PATIENT_AGE) {
    return `Our model is validated for ages ${MIN_PATIENT_AGE}–${MAX_PATIENT_AGE}.`;
  }

  return null;
}

export function clampIsoDateToBounds(isoDate: string): string | null {
  const dob = parseIsoDate(isoDate);
  if (!dob) return null;

  const { min, max } = getDobBounds();
  if (dob < min) return toIsoDate(min);
  if (dob > max) return toIsoDate(max);
  return isoDate;
}

export function isValidDegree(value: string | null | undefined): value is DegreeOption {
  return Boolean(value && (DEGREE_OPTIONS as readonly string[]).includes(value));
}

export function getMajorGroupsForDegree(degree: string | null): readonly MajorSchoolGroup[] {
  if (!degree || degree === 'No High School' || degree === 'High School Diploma') {
    return LOW_EDUCATION_MAJOR_GROUPS;
  }
  return MAJOR_SCHOOL_GROUPS;
}

export function getMajorOptionsForDegree(degree: string | null): readonly string[] {
  return getMajorGroupsForDegree(degree).flatMap((group) => group.majors);
}

export function isValidMajorForDegree(major: string, degree: string | null): boolean {
  const trimmed = major.trim();
  if (!trimmed) return false;
  return getMajorOptionsForDegree(degree).includes(trimmed);
}

export function validateMajor(major: string, degree: string | null): string | null {
  const trimmed = major.trim();
  if (!trimmed) {
    return 'Please select your major or field of study.';
  }
  if (!isValidMajorForDegree(trimmed, degree)) {
    return 'Please select a valid major for your education level.';
  }
  return null;
}

export function validateDegree(degree: string | null): string | null {
  if (!isValidDegree(degree)) {
    return 'Please select a valid degree.';
  }
  return null;
}
