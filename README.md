# Todolist-app

## Environment setup

Copy `.env.example` to `.env` and set the values you need:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/TaskFlowDB
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

If `GROQ_API_KEY` is missing, the app still starts normally but AI endpoints return `503 AI chưa được cấu hình`.
