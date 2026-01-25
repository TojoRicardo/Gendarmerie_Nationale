import { get, post, put, del } from './apiGlobal'

const BASE_ENDPOINT = '/criminel/assignations/'

export const fetchAssignations = async (params = {}) => {
  const response = await get(BASE_ENDPOINT, { params })
  return response.data
}

export const createAssignation = async (data) => {
  const response = await post(BASE_ENDPOINT, data)
  return response.data
}

export const updateAssignation = async (id, data) => {
  const response = await put(`${BASE_ENDPOINT}${id}/`, data)
  return response.data
}

export const deleteAssignation = async (id) => {
  const response = await del(`${BASE_ENDPOINT}${id}/`)
  return response.data
}

export const fetchDossiers = async () => {
  const response = await get(`${BASE_ENDPOINT}dossiers/`)
  return response.data
}

export const fetchEnqueteurs = async () => {
  const response = await get(`${BASE_ENDPOINT}enqueteurs/`)
  return response.data
}

export const confirmAssignation = async (id) => {
  const response = await post(`${BASE_ENDPOINT}${id}/confirmer/`)
  return response.data
}

export default {
  fetchAssignations,
  createAssignation,
  updateAssignation,
  deleteAssignation,
  fetchDossiers,
  fetchEnqueteurs,
  confirmAssignation,
}

