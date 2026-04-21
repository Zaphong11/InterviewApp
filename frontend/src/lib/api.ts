import axios from 'axios';

// Lấy API URL từ biến môi trường.
// Nếu ở môi trường Production (Docker build), ta để trống ('') để trình duyệt gọi theo relative path nhằm tận dụng Nginx Proxy.
// Nếu ở môi trường Dev local, ta mặc định gọi thẳng sang backend ở 127.0.0.1:8000.
const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL || (isProd ? '' : 'http://127.0.0.1:8000');

// Tạo instance axios chung cho cả app
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tự động đính kèm Token vào mỗi request nếu đã đăng nhập
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Sau này login xong sẽ lưu token vào đây
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;