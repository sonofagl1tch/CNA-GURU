# Use x86_64 architecture explicitly
FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.12

# Install streamlit and other requirements
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip3 install -r requirements.txt --no-cache-dir

# Copy your application code
COPY *.py ./
COPY *.png ./ 

# Expose the Streamlit port
EXPOSE 8501

# Add healthcheck
HEALTHCHECK --interval=600s --timeout=2s --retries=12 \
    CMD ["curl", "-f", "http://localhost:8501/"]

# Use python to run streamlit instead of direct execution
ENTRYPOINT ["python", "-m", "streamlit", "run", "app.py", "--server.headless", "true", "--browser.serverAddress=0.0.0.0", "--browser.gatherUsageStats=false"]

# Set non-root user
USER 1001