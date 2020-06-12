import os
from flask import Flask, render_template, request, Response, url_for, send_file, abort

app = Flask(__name__)

@app.route("/")
def root():
    target_url = url_for('static', filename="Japanese Picture Dictionary.pdf")
    return render_template('/viewer.html', TARGET_URL=target_url)

@app.route("/<path:target>")
def view(target):
    files_dir = os.environ.get('FILES_DIR') or '/var/www'
    if target.endswith('.pdf'):
        path = os.path.join(files_dir, target)
        app.logger.info('serviing %s', path)
        return send_file(path)
    target += '.pdf'
    path = os.path.join(files_dir, target)
    if not os.path.isfile(path):
        abort(404)
    return render_template('/viewer.html', TARGET_URL=url_for('view', target=target), READ_DIRECTION='rtl')

class AdjustScriptNameMW:
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        prefix = environ.get('HTTP_SCRIPT_NAME')
        if prefix:
            environ['SCRIPT_NAME'] = prefix + environ.get('SCRIPT_NAME', '')
        return self.app(environ, start_response)

app.wsgi_app = AdjustScriptNameMW(app.wsgi_app)