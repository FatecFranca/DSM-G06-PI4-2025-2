import axios from "axios";

const api = axios.create({
    baseURL: 'https://api.example.com', // Substitua pela URL da sua API
});

export default api;