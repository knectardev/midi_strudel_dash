# Add-Type -AssemblyName System.Net.HttpListener
Add-Type -AssemblyName System.Net

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')

try {
    $listener.Start()
    Write-Host 'Server running at http://localhost:8000/'
    Write-Host 'Press Ctrl+C to stop'

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $localPath = $request.Url.LocalPath
            if ($localPath -eq '/') { 
                $localPath = '/index.html' 
            }
            
            $filePath = Join-Path (Get-Location) $localPath.TrimStart('/')
            
            if (Test-Path $filePath) {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                
                # Set appropriate content type
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($extension) {
                    '.html' { $response.ContentType = 'text/html' }
                    '.css' { $response.ContentType = 'text/css' }
                    '.js' { $response.ContentType = 'application/javascript' }
                    '.wav' { $response.ContentType = 'audio/wav' }
                    '.mp3' { $response.ContentType = 'audio/mpeg' }
                    default { $response.ContentType = 'application/octet-stream' }
                }
                
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $response.StatusCode = 404
                $errorContent = [System.Text.Encoding]::UTF8.GetBytes('File not found')
                $response.OutputStream.Write($errorContent, 0, $errorContent.Length)
            }
            
            $response.Close()
        }
        catch [System.Net.HttpListenerException] {
            # This usually means the listener was stopped (Ctrl+C)
            break
        }
        catch {
            Write-Host "Request error: $($_.Exception.Message)"
        }
    }
}
catch [System.Net.HttpListenerException] {
    Write-Host "Failed to start server on port 8000. Port may be in use."
}
catch {
    Write-Host "Server error: $($_.Exception.Message)"
}
finally {
    if ($listener -and $listener.IsListening) {
        try {
            $listener.Stop()
            $listener.Close()
        } catch {
            # Ignore any cleanup errors
        }
    }
    Write-Host "Server stopped."
} 