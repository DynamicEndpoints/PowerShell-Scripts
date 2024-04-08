<#
.SYNOPSIS
    Script to check and modify local administrators group membership.

.DESCRIPTION
    This script identifies the currently signed-in user, checks if they are a member of the local administrators group,
    and adds them to the group if they are not already a member. It also displays the list of local administrators and
    highlights the current user in the list. 
.EXAMPLE
    .\LocalAdminCheck.ps1

.NOTES
    Author: Kameron McCain
#>

try {
    # Get the currently signed-in user
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

    # Use 'net localgroup' to retrieve local administrators
    $localAdmins = net localgroup Administrators
    # Parsing the output to exclude unnecessary lines
    $adminsList = $localAdmins | Select-String "^\w.+$" | ForEach-Object { $_.Matches.Value.Trim() }

    # Check if the current user is a local administrator
    if ($adminsList -contains $currentUser) {
        Write-Output "The currently signed-in user '$currentUser' is a local administrator."
    } else {
        try {
            # Add the current user to the local administrators group
            net localgroup Administrators $currentUser /add
            Write-Output "The currently signed-in user '$currentUser' has been added to the local administrators group."
        } catch {
            Write-Error "An error occurred while trying to add the current user to the local administrators group: $_"
        }
    }

    # Display the updated list of local administrators
    Write-Output "Local Administrators:"
    $updatedLocalAdmins = net localgroup Administrators
    $updatedAdminsList = $updatedLocalAdmins | Select-String "^\w.+$" | ForEach-Object { $_.Matches.Value.Trim() }
    foreach ($admin in $updatedAdminsList) {
        if ($admin -eq $currentUser) {
            Write-Output "$admin (Current User)"
        } else {
            Write-Output $admin
        }
    }
} catch {
    Write-Error "An error occurred while trying to retrieve group members or identify the current user: $_"
}
