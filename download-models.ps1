# download-models.ps1
New-Item -ItemType Directory -Force -Path "static/models"

$baseUrl = "https://github.com/justadudewhohacks/face-api.js/raw/master/weights"

$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_tiny_model-weights_manifest.json",
    "face_landmark_68_tiny_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $output = "static/models/$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Saved to $output"
}

Write-Host "`n✅ All models downloaded successfully!"