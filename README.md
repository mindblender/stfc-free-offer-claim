# STFC Free gift claim script

This TamperMonkey script is used for the Star Trek Fleet Command (STFC) game to automatically claim the free gifts on the web site.

## Features
- Claim free gifts that are presented in the STFC Store's "Web Gifts" tab.
- Display a visualaization of claimed gifts.
- Export data in CSV format to analyze offline

## Requirements
1. [TamperMonkey](https://www.tampermonkey.net/)
2. Login for the Scopely [STFC](https://home.startrekfleetcommand.com/) site

## Installation
1. Login to the [STFC](https://home.startrekfleetcommand.com) site
1. Navigate to the [STFC Store](https://home.startrekfleetcommand.com/store)
1. Click the TamperMonkey icon and choose "Create a New Script"
1. Copy and paste the [claim-free-gifts code](https://raw.githubusercontent.com/mindblender/stfc-free-offer-claim/refs/heads/main/claim-free-gifts.js) and paste it into the TamperMonkey editor
1. Save the changes
1. Refresth the STFC store
1. You should see a red "1" on the TamperMonkey icon to indicate that there is a script running.


## Usage
In order for the script to work, you need to leave a web browser window/tab open.  This allows the script to monitor when new gifts are "enabled" and to "claim" them.

To view a list of gifts claimed using this script, navigate to the [Claimed Offers](https://home.startrekfleetcommand.com/view-claims) view.  Note: this is not a Scopely page, but one being dynamically created via this script.


## Known Issues
- When Scopely performs website maintenance, the script will stop functioning.  To fix this, just refresth the STFC Store page when maintenance is complete.

- Scopely login session expires.  This happens when your login session expires.  Since this script ***does not*** have access to your login credentials, you must manually login.

