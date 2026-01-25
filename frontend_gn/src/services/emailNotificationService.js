import { get } from './apiGlobal'

const BASE_ENDPOINT = '/assignations/emails/'

export const fetchEmails = async (params = {}) => {
  const response = await get(BASE_ENDPOINT, { params })
  return response.data
}

export default {
  fetchEmails,
}

