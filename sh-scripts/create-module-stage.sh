#!/bin/bash

usage()
{
    echo 'create-module-stage.sh --stage-dir <stage-dir> --live-module-dir <live-module-dir>'
    exit 1
}

alias errcho='>&2 echo'

if [ $# -lt 4 ]; then
    usage
fi

while [ "$1" != "" ]; do
    case $1 in
        --stage-dir  )          shift
                                stage_dir="$1"
                                ;;
        --live-module-dir )     shift
                                live_module_dir="$1"
                                ;;
    esac
    shift
done

if [ "$stage_dir" == "" ]; then
    usage
fi

if [ "$live_module_dir" == "" ]; then
    usage
fi

cd "$stage_dir" && git clone "$live_module_dir" && cd `basename "$live_module_dir"`