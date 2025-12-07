from flask import render_template
from flask import Blueprint

home_page = Blueprint('home_page', __name__, url_prefix='/')

@home_page.route('/')
def home():
    return render_template('index.html')