/**
 * Shared dropdown options used across admission forms, student profile, etc.
 *
 * NOTE: When Settings module data is wired into a shared config store, these
 * should read from the store (classes from Academic Setup, grades from
 * Grading Rules, etc.) instead of being hardcoded here.
 */

import type { FilterOption } from '@/types/common.types';

// ─── Classes / Grades ──────────────────────────────────────────
export const classOptions: FilterOption[] = [
  { label: 'Nursery', value: 'Nursery' },
  { label: 'LKG', value: 'LKG' },
  { label: 'UKG', value: 'UKG' },
  { label: 'Class I', value: 'I' },
  { label: 'Class II', value: 'II' },
  { label: 'Class III', value: 'III' },
  { label: 'Class IV', value: 'IV' },
  { label: 'Class V', value: 'V' },
  { label: 'Class VI', value: 'VI' },
  { label: 'Class VII', value: 'VII' },
  { label: 'Class VIII', value: 'VIII' },
  { label: 'Class IX', value: 'IX' },
  { label: 'Class X', value: 'X' },
  { label: 'Class XI', value: 'XI' },
  { label: 'Class XII', value: 'XII' },
];

// ─── Gender ────────────────────────────────────────────────────
export const genderOptions: FilterOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

// ─── Blood Group ───────────────────────────────────────────────
export const bloodGroupOptions: FilterOption[] = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'Unknown', value: 'Unknown' },
];

// ─── Religion ──────────────────────────────────────────────────
export const religionOptions: FilterOption[] = [
  { label: 'Hindu', value: 'Hindu' },
  { label: 'Muslim', value: 'Muslim' },
  { label: 'Christian', value: 'Christian' },
  { label: 'Sikh', value: 'Sikh' },
  { label: 'Buddhist', value: 'Buddhist' },
  { label: 'Jain', value: 'Jain' },
  { label: 'Parsi', value: 'Parsi' },
  { label: 'Other', value: 'Other' },
];

// ─── Category (Indian gov quota system) ────────────────────────
export const categoryOptions: FilterOption[] = [
  { label: 'General', value: 'General' },
  { label: 'OBC', value: 'OBC' },
  { label: 'SC', value: 'SC' },
  { label: 'ST', value: 'ST' },
  { label: 'EWS', value: 'EWS' },
];

// ─── Nationality ───────────────────────────────────────────────
export const nationalityOptions: FilterOption[] = [
  { label: 'Indian', value: 'Indian' },
  { label: 'NRI', value: 'NRI' },
  { label: 'OCI', value: 'OCI' },
  { label: 'Foreign National', value: 'Foreign National' },
];

// ─── Mother Tongue ─────────────────────────────────────────────
export const motherTongueOptions: FilterOption[] = [
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Marathi', value: 'Marathi' },
  { label: 'Gujarati', value: 'Gujarati' },
  { label: 'Tamil', value: 'Tamil' },
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Kannada', value: 'Kannada' },
  { label: 'Malayalam', value: 'Malayalam' },
  { label: 'Bengali', value: 'Bengali' },
  { label: 'Punjabi', value: 'Punjabi' },
  { label: 'Urdu', value: 'Urdu' },
  { label: 'Odia', value: 'Odia' },
  { label: 'Assamese', value: 'Assamese' },
  { label: 'Other', value: 'Other' },
];

// ─── Indian States & Union Territories ─────────────────────────
export const stateOptions: FilterOption[] = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
  { label: 'Assam', value: 'Assam' },
  { label: 'Bihar', value: 'Bihar' },
  { label: 'Chhattisgarh', value: 'Chhattisgarh' },
  { label: 'Goa', value: 'Goa' },
  { label: 'Gujarat', value: 'Gujarat' },
  { label: 'Haryana', value: 'Haryana' },
  { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
  { label: 'Jharkhand', value: 'Jharkhand' },
  { label: 'Karnataka', value: 'Karnataka' },
  { label: 'Kerala', value: 'Kerala' },
  { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
  { label: 'Maharashtra', value: 'Maharashtra' },
  { label: 'Manipur', value: 'Manipur' },
  { label: 'Meghalaya', value: 'Meghalaya' },
  { label: 'Mizoram', value: 'Mizoram' },
  { label: 'Nagaland', value: 'Nagaland' },
  { label: 'Odisha', value: 'Odisha' },
  { label: 'Punjab', value: 'Punjab' },
  { label: 'Rajasthan', value: 'Rajasthan' },
  { label: 'Sikkim', value: 'Sikkim' },
  { label: 'Tamil Nadu', value: 'Tamil Nadu' },
  { label: 'Telangana', value: 'Telangana' },
  { label: 'Tripura', value: 'Tripura' },
  { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
  { label: 'Uttarakhand', value: 'Uttarakhand' },
  { label: 'West Bengal', value: 'West Bengal' },
  // Union Territories
  { label: 'Andaman & Nicobar Islands', value: 'Andaman & Nicobar Islands' },
  { label: 'Chandigarh', value: 'Chandigarh' },
  { label: 'Dadra & Nagar Haveli and Daman & Diu', value: 'Dadra & Nagar Haveli and Daman & Diu' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Jammu & Kashmir', value: 'Jammu & Kashmir' },
  { label: 'Ladakh', value: 'Ladakh' },
  { label: 'Lakshadweep', value: 'Lakshadweep' },
  { label: 'Puducherry', value: 'Puducherry' },
];
