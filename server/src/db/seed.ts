import { db } from "./index.js";
import { users } from "./schema.js";

const seedUsers = [
  { fullName: "Alice Chen", craftAbility: "Engineering", jobLevel: "Senior", craftFocus: "Frontend" },
  { fullName: "Bob Martinez", craftAbility: "Engineering", jobLevel: "Staff", craftFocus: "Backend" },
  { fullName: "Carol Nguyen", craftAbility: "Design", jobLevel: "Mid", craftFocus: "Not Applicable" },
  { fullName: "David Kim", craftAbility: "Engineering", jobLevel: "Junior", craftFocus: "Fullstack" },
  { fullName: "Elena Popov", craftAbility: "Product Management", jobLevel: "Senior", craftFocus: "Not Applicable" },
  { fullName: "Frank O'Brien", craftAbility: "Data Science", jobLevel: "Mid", craftFocus: "Backend" },
  { fullName: "Grace Tanaka", craftAbility: "Engineering", jobLevel: "Principal", craftFocus: "Infrastructure" },
  { fullName: "Hassan Ali", craftAbility: "Design", jobLevel: "Senior", craftFocus: "Mobile" },
  { fullName: "Iris Johansson", craftAbility: "Engineering", jobLevel: "Mid", craftFocus: "Mobile" },
  { fullName: "James Wright", craftAbility: "Product Management", jobLevel: "Staff", craftFocus: "Not Applicable" },
  { fullName: "Karen Liu", craftAbility: "Data Science", jobLevel: "Senior", craftFocus: "Infrastructure" },
  { fullName: "Leo Santos", craftAbility: "Engineering", jobLevel: "Junior", craftFocus: "Frontend" },
  { fullName: "Maya Patel", craftAbility: "Design", jobLevel: "Junior", craftFocus: "Not Applicable" },
  { fullName: "Nathan Fischer", craftAbility: "Engineering", jobLevel: "Staff", craftFocus: "Fullstack" },
  { fullName: "Olivia Dupont", craftAbility: "Data Science", jobLevel: "Principal", craftFocus: "Backend" },
];

// Clear existing users and insert seed data
db.delete(users).run();
db.insert(users).values(seedUsers).run();

console.log(`Seeded ${seedUsers.length} users.`);
