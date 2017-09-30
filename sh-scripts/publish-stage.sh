#!/bin/bash

usage()
{
    echo 'publish-stage.sh --live-module-dir <live-module-dir> --stage-module-dir <stage-module-dir>'
    exit 1
}

alias errcho='>&2 echo'

if [ $# -lt 4 ]; then
    usage
fi

while [ "$1" != "" ]; do
    case $1 in
        --stage-module-dir  )   shift
                                stage_module_dir="$1"
                                ;;
        --live-module-dir  )    shift
                                live_module_dir="$1"
                                ;;
    esac
    shift
done

if [ "$stage_module_dir" == "" ]; then
    usage
fi

if [ "$live_module_dir" == "" ]; then
    usage
fi


cd "$live_module_dir" && git pull "$stage_module_dir" && cd "$stage_module_dir" && cd .. && rm -rf `basename "$stage_module_dir"`
