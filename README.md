# TypeTaupe

Learn keyboard typing with a cute mole !


![practice]()

TypeTaupe is a keyboard typing website, and uses a list of predefined words for the users to train on. 

![challenge]()

The users can race each other in speed typing challenges, and a visual keyboard helps them visualize in real-time what their fingers are pressing.

![wordslist]()

Only the admin of the website can modify this list.

# Installation, Usage

Clone this repository on your PC. After, that run the dedicated start script:
- `./start.sh`  using the Linux/MacOS/WSL terminal
- `./start.ps1` using Windows Powershell

To stop the servers from running, simply kill the script with `Ctrl+C` in the terminal.

# Project Info

## Choices

I wanted to opt for an iterative development, and build and refine over the precedent choices that I made. But some **core* choices were just plain wrong to begin with, and moving on from them did not work out for me. This is why i made the following errors:

- the way the user gets connected is with a token stored in `sessionStorage`, and not as a HTTP only cookie
- i started with storing the users in plain text, and moving on to a database was difficult
- i wanted to store the lines of text added to the website to be in the database, but i didn't manage to refactor the codebase to that extent.


I would have also liked to have a way to grab random words of the English dictionnary, instead of having to write words myself. I requested an API key from [Wordnik](https://developer.wordnik.com/) that could have done this, but Wordnik takes a long time before giving out their API keys.
