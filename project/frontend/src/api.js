import axios from 'axios';

// Backend URL'in
const BASE_URL = 'http://localhost:8000';

// Axios instance'ı oluşturuyoruz
const API = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default API;