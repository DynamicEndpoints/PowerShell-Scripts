<#
# Windows Update and App Update Script

## Synopsis
This script checks if winget is installed, installs it if not found, updates all apps using winget, checks for Windows updates, and installs them if available.

## Description
The script performs the following steps:
1. Checks if winget is installed. If not found, it downloads and installs winget.
2. Updates all apps using winget.
3. Checks if the PSWindowsUpdate module is installed. If not found, it installs the module.
4. Imports the PSWindowsUpdate module.
5. Checks for available Windows updates.
6. If updates are found, it installs them and automatically reboots the system.

## Notes
- Author: Kameron McCain
- Date: April 8th 2024
- Version: 1.0
#>

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
