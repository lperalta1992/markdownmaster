# Start MarkDownMaster locally (Bypasses Docker Hub issues)

Write-Host "Starting Backend..." -ForegroundColor Cyan
# Start the backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:OLLAMA_HOST='http://100.100.183.43:11434'; cd backend; & '.\.venv\Scripts\uvicorn.exe' main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Starting Frontend..." -ForegroundColor Cyan
# Start the frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "All services started! Access the app at http://localhost:5173" -ForegroundColor Green
