import { get, post, patch, del } from './apiGlobal'

const BASE_URL = '/emails/'

export const fetchInbox = async (params = {}) => {
  const response = await get(BASE_URL, { params })
  return response.data
}

export const fetchSent = async (params = {}) => {
  const response = await get(`${BASE_URL}envoyes/`, { params })
  return response.data
}

export const fetchEmail = async (id) => {
  const response = await get(`${BASE_URL}${id}/`)
  return response.data
}

export const toggleRead = async (id, lu = true) => {
  const response = await patch(`${BASE_URL}${id}/lu/`, { lu })
  return response.data
}

export const deleteEmail = async (id) => {
  const response = await del(`${BASE_URL}${id}/`)
  return response.data
}

export const sendEmail = async (payload) => {
  const response = await post(BASE_URL, payload)
  return response.data
}

export default {
  fetchInbox,
  fetchSent,
  fetchEmail,
  toggleRead,
  deleteEmail,
  sendEmail,
}

