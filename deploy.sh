#!/bin/sh
gsutil cp -Z *.html  gs://www.pcbxprt.com/
gsutil cp -Z *.js  gs://www.pcbxprt.com/
gsutil cp -Z *.wasm  gs://www.pcbxprt.com/
gsutil -m setmeta -h "Cache-control: no-transform, max-age=3600" gs://www.pcbxprt.com/*.html
gsutil -m setmeta \
	-h "Content-Type: text/javascript; charset=utf-8" \
	-h "Cache-control: no-transform, max-age=3600" \
	gs://www.pcbxprt.com/*.js
gsutil -m setmeta \
	-h "Content-Type: application/wasm" \
	-h "Cache-control: no-transform, max-age=3600" \
	gs://www.pcbxprt.com/*.wasm

gsutil acl ch -u AllUsers:R gs://www.pcbxprt.com/*
echo all done!!!
