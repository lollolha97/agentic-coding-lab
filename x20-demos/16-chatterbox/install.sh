set -x
python3 -m venv .venv && . .venv/bin/activate
pip install -q --upgrade pip
pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -q chatterbox-tts
echo INSTALL_DONE
