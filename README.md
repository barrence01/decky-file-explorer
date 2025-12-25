# decky-file-explorer
Let's you access your Steam Deck files from anywhere


Steam stores screenshots by default in a hidden directory separated by game.
But you can change the default directory to a more accessible one.

You need to go to: `Steam > Settings > in-game` and there should have an option to store to a specific folder.

For videos, you'd need to change it in `Steam > Settings > game recording`, but the actual video file won't be playable until you assemble the files on steam panel.
I have added a feature in the hamburguer button to simplify this process, there you will have options to assemble the video, but it may use some CPU from your Steam Deck.

This plugin uses bcrypt lib and it needs to be compiled. There a 2 ways to do it.

1. Install through `pip install bcrypt`

2. Compile using docker:
    cd /backend/_bcrypt
    # Build Image
    sudo docker build -t bcrypt-builder .
    # Build binary
    sudo docker run --rm -v "$(pwd)":/backend bcrypt-builder

    * The output will be on `backend/out`, you need to copy the file to `bin/`


# Main menu of the plugin
<img width="20%" height="20%" alt="HOME_MENU" src="https://github.com/user-attachments/assets/3efce970-82f7-4af6-a999-493f687787b4" />

# Settings
<img width="30%" height="30%" alt="SETTINGS_MENU" src="https://github.com/user-attachments/assets/6f7685c5-05b5-4c0c-81c0-8f8d2e583245" />

# Web UI - Main Menu
<img width="60%" height="60%"  alt="WEBUI_DESKTOP_MAIN_MENU" src="https://github.com/user-attachments/assets/862306d4-d099-4200-82c8-f10ca648558a" />

# Web UI - Mobile
<img width="20%" height="20%" alt="WEBUI_MOBILE_MAIN_MENU" src="https://github.com/user-attachments/assets/f6f07dc5-c625-4cfc-80a8-7e6d3d0de733" />


# Assembling game records
<img width="60%" height="60%" alt="ASSEMBLE_GAME_RECORDING" src="https://github.com/user-attachments/assets/13b291bb-0108-483c-bbf1-0fbb3594708e" />

# Video Playback
<img width="60%" height="60%" alt="VIDEO_PLAYBACK_GAME_RECORDING" src="https://github.com/user-attachments/assets/68d5a9cc-22c9-4f53-b3c7-eb1f9b671279" />



