#Checking if winget is installed or not
if((Get-Command -Name winget -ErrorAction SilentlyContinue) -eq $null){
    Write-Output "winget not found, installing winget"
    #Installing winget
    (New-Object System.Net.WebClient).DownloadFile("https://github.com/microsoft/winget-cli/releases/download/v0.4.40006-preview/winget.exe", "$env:temp\winget.exe")
    Start-Process "$env:temp\winget.exe" '/install /quiet /norestart' -Wait
}

# Update all apps using winget
winget upgrade --all

#Checking if PSWindowsUpdate module is installed or not
if((Get-Module -Name PSWindowsUpdate -ErrorAction SilentlyContinue) -eq $null){
    #Installing PSWindowsUpdate module
    Install-Module -Name PSWindowsUpdate
}

#Importing PSWindowsUpdate module
Import-Module PSWindowsUpdate

#Checking for updates
$updates = Get-WindowsUpdate
if($updates) {
    #Installing updates
    Install-WindowsUpdate -AcceptAll -AutoReboot
}
