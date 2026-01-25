
Add-Type -AssemblyName System.Drawing

$sidebarPath = "C:/Users/Rohit/.gemini/antigravity/brain/a6b1a28b-402f-4f46-823d-f2ff4382ffb4/installer_sidebar_1769256397039.png"
$headerPath = "C:/Users/Rohit/.gemini/antigravity/brain/a6b1a28b-402f-4f46-823d-f2ff4382ffb4/installer_header_1769256412454.png"

$sidebarDest = "c:\Users\Rohit\Documents\Documents_application\Study_stream_BLACK\Study_Stream-master\Study_Stream-master\build\installer-sidebar.bmp"
$headerDest = "c:\Users\Rohit\Documents\Documents_application\Study_stream_BLACK\Study_Stream-master\Study_Stream-master\build\installer-header.bmp"

Write-Host "Converting Sidebar..."
$sidebar = [System.Drawing.Image]::FromFile($sidebarPath)
$sidebar.Save($sidebarDest, [System.Drawing.Imaging.ImageFormat]::Bmp)
$sidebar.Dispose()

Write-Host "Converting Header..."
$header = [System.Drawing.Image]::FromFile($headerPath)
$header.Save($headerDest, [System.Drawing.Imaging.ImageFormat]::Bmp)
$header.Dispose()

Write-Host "Done."
