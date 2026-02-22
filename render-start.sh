#!/usr/bin/env bash
set -o errexit

gunicorn vibely_backend.wsgi:application
