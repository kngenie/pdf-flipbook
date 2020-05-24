from flask import Flask, render_template, request, Response, url_for

app = Flask(__name__)

@app.route("/")
def root():
    target_url = url_for('static', filename="Japanese Picture Dictionary.pdf")
    return render_template('/viewer.html', TARGET_URL=target_url)
