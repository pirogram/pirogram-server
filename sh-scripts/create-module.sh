#!/bin/bash

usage()
{
    echo 'create-module.sh --module-dir <module-dir>'
    exit 1
}

alias errcho='>&2 echo'

if [ $# -lt 2 ]; then
    usage
fi

while [ "$1" != "" ]; do
    case $1 in
        --module-dir  )         shift
                                module_dir="$1"
                                ;;
    esac
    shift
done

if [ "$module_dir" == "" ]; then
    usage
fi

cd "$module_dir" && git init . && git add * && git commit -am "creating module"