#!/bin/bash

usage()
{
    echo 'commit-topic.sh --stage-module-dir <stage-module-dir> --topic-file-name <topic-file-name> --old-topic-file-name <old-topic-file-name>'
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
        --topic-file-name )     shift
                                topic_file_name="$1"
                                ;;
        --old-topic-file-name ) shift
                                old_topic_file_name="$1"
                                ;;
    esac
    shift
done

if [ "$stage_module_dir" == "" ]; then
    usage
fi

if [ "$topic_file_name" == "" ]; then
    usage
fi

cd "$stage_module_dir"

if [ "$old_topic_file_name" != "" ]; then
    git rm "$old_topic_file_name"
fi

git add "$topic_file_name" module.json && git commit -am "Committing topic"