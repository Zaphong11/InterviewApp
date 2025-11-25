import axios from 'axios';

// Tạo instance axios chung cho cả app
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/',
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