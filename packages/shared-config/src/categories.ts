export interface ServiceCategory {
  id: string
  label: string
  desc: string
  isComingSoon?: boolean
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'pharmacy',   label: 'Pharmacy',   desc: 'Prescriptions & medications' },
  { id: 'laboratory', label: 'Laboratory', desc: 'Blood tests, pathology & diagnostics' },
  { id: 'doctor',     label: 'Doctor',     desc: 'General & specialist consultations' },
  { id: 'radiology',  label: 'Radiology',  desc: 'X-Ray, MRI, CT Scan & ultrasound' },
  { id: 'hospital',   label: 'Hospital',   desc: 'Emergency, surgery & inpatient care' },
  { id: 'clinic',     label: 'Clinic',     desc: 'General practice & wellness checks' },
  { id: 'global_specialists', label: 'Global Medical Specialist Centers', desc: 'International tertiary care & medical tourism', isComingSoon: true },
]
