from setuptools import setup, find_packages

setup(
    name="pdfbook",
    version="0.1.0",
    package=find_packages(),
    install_requires=[
        "Flask",
        "gunicorn"
    ]
)