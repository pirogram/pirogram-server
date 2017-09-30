#!/bin/bash

usage()
{
    echo 'commit-module-json.sh --stage-module-dir <stage-module-dir>'
    exit 1
}

alias errcho='>&2 echo'

if [ $# -lt 2 ]; then
    usage
fi

while [ "$1" != "" ]; do
    case $1 in
        --stage-module-dir  )   shift
                                stage_module_dir="$1"
                                ;;
    esac
    shift
done

if [ "$stage_module_dir" == "" ]; then
    usage
fi

cd "$stage_module_dir" && git add module.json && git commit -am "Updated module.json"
