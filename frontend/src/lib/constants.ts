export const options = [
  { value: "marketing", label: "Marketing" },
  { value: "template", label: "Template" },
  { value: "development", label: "Development" },
];
export const serviceTypeOptions = [
  { value: "regular", label: "Regular" },
  { value: "rush", label: "Rush" },

];

export const laUnionMunicipalities = [
  "AGOO", "ARINGAY", "BACNOTAN", "BAGULIN", "BALAOAN", "BANGAR", "BAUANG", "BURGOS",
  "CABA", "LUNA", "NAGUILIAN", "PUGO", "ROSARIO", "SAN FERNANDO CITY", "SAN GABRIEL",
  "SAN JUAN", "SANTO TOMAS", "SANTOL", "SUDIPEN", "TUBAO"
];

// Map municipality to possible districts
export const municipalityDistricts: Record<string, string[]> = {
  AGOO: ["Agoo East", "Agoo West"],
  LUNA: ["Luna I", "Luna II"],
  BAUANG: ["Bauang North", "Bauang South"],
  // ...add other mappings as needed...
  // For municipalities with only one district, use a single-element array
  "SAN FERNANDO CITY": ["San Fernando City"],
  "ARINGAY": ["Aringay"],
  "BACNOTAN": ["Bacnotan"],
  "BAGULIN": ["Bagulin"],
  "BALAOAN": ["Balaoan"],
  "BANGAR": ["Bangar"],
  "BURGOS": ["Burgos"],
  "CABA": ["Caba"],
  "NAGUILIAN": ["Naguilian"],
  "ROSARIO": ["Rosario"],
  "PUGO": ["Pugo"],
  "SAN GABRIEL": ["San Gabriel"],
  "SAN JUAN": ["San Juan"],
  "SANTO TOMAS": ["Santo Tomas"],
  "SANTOL": ["Santol"],
  "SUDIPEN": ["Sudipen"],
  "TUBAO": ["Tubao"],

  // etc.
};

// 1st district municipalities
export const firstDistrictMunicipalities = [
  "BANGAR", "LUNA", "SUDIPEN", "BALAOAN", "SANTOL", "BACNOTAN",
  "SAN GABRIEL", "SAN JUAN", "SAN FERNANDO CITY"
];
export const secondDistrictMunicipalities = [
  "AGOO", "ARINGAY", "BAGULIN", "BAUANG", "BURGOS", "CABA",
  "NAGUILIAN", "PUGO", "ROSARIO", "SANTO TOMAS", "TUBAO"
];

export const roleMap: Record<string, string> = {
  admin: "Administrator",
  school_head: "School Head",
  school_admin: "School Admin",
  district_admin: "District Admin",
  superintendent: "Superintendent",
  liquidator: "Liquidator",
  accountant: "Accountant",
};
export const pricing = {
  regularClothes: 35,
  jeans: 45,
  linens: 50,
  comforter: 40,
};

export const customerFrequency = [
  {
    "customerName": "David Lee",
    "frequency": 6,
    "totalSpend": 180.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "John Doe",
    "frequency": 5,
    "totalSpend": 150.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Lisa Nguyen",
    "frequency": 5,
    "totalSpend": 150.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Bob Johnson",
    "frequency": 4,
    "totalSpend": 120.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Michael Brown",
    "frequency": 4,
    "totalSpend": 120.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Jane Smith",
    "frequency": 3,
    "totalSpend": 90.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Sarah Taylor",
    "frequency": 3,
    "totalSpend": 90.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Kevin White",
    "frequency": 2,
    "totalSpend": 60.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Maria Rodriguez",
    "frequency": 2,
    "totalSpend": 60.00,
    "averageSpend": 30.00
  },
  {
    "customerName": "Emily Chen",
    "frequency": 1,
    "totalSpend": 30.00,
    "averageSpend": 30.00
  }
]
export const ranges = [{ id: 1, name: 'Last 7 days' }, { id: 2, name: 'Last 14 days' }, { id: 3, name: 'Last 30 days' }, { id: 4, name: 'Last 90 days' }];
export interface Transaction {
  id: number;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    contact_number: string;
    address: string;
  };
  service_type: string;
  service_type_display: string;
  status: string;
  status_display: string;
  regular_clothes_weight: number;
  jeans_weight: number;
  linens_weight: number;
  comforter_weight: number;
  subtotal: number;
  additional_fee: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// School district options for district admin role
export const schoolDistrictOptions = [
  "Agoo East", "Agoo West",
  "Luna I", "Luna II",
  "Bauang North", "Bauang South",
  "San Fernando City",
  "Aringay",
  "Bacnotan",
  "Bagulin",
  "Balaoan",
  "Bangar",
  "Burgos",
  "Caba",
  "Naguilian",
  "Rosario",
  "Pugo",
  "San Gabriel",
  "San Juan",
  "Santo Tomas",
  "Santol",
  "Sudipen",
  "Tubao"
];

