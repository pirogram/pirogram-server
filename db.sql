--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.3
-- Dumped by pg_dump version 9.6.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: exercise_history; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE exercise_history (
    user_id integer NOT NULL,
    exercise_id varchar(64) NOT NULL,
    solution jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    primary key (user_id, exercise_id)
);


ALTER TABLE exercise_history OWNER TO turtleprogrammer;

--
-- Name: exercises; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE exercises (
    module_id varchar(36) NOT NULL,
    topic_id VARCHAR(36) NOT NULL,
    exercise_id varchar(64) NOT NULL,
    type character varying(64) NOT NULL,
    content jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (module_id, topic_id, exercise_id)
);


ALTER TABLE exercises OWNER TO turtleprogrammer;

--
-- Name: quizes; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE quizes (
    uuid character varying(36) NOT NULL,
    markdown text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE quizes OWNER TO turtleprogrammer;

--
-- Name: toc; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE module (
    slug character varying(64) NOT NULL,
    name CHARACTER varying(64) NOT NULL,
    toc_yaml text NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE toc OWNER TO turtleprogrammer;

--
-- Name: topic_drafts; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE topic_drafts (
    topic_id integer NOT NULL,
    author_id integer NOT NULL,
    title character varying(256) NOT NULL,
    markdown text NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE topic_drafts OWNER TO turtleprogrammer;

--
-- Name: topic_edit_history; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE topic_edit_history (
    id integer NOT NULL,
    topic_id integer,
    author_id integer,
    slug character varying(256) NOT NULL,
    title character varying(256) NOT NULL,
    version_number integer NOT NULL,
    markdown text NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE topic_edit_history OWNER TO turtleprogrammer;

--
-- Name: topic_edit_history_id_seq; Type: SEQUENCE; Schema: public; Owner: turtleprogrammer
--

CREATE SEQUENCE topic_edit_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE topic_edit_history_id_seq OWNER TO turtleprogrammer;

--
-- Name: topic_edit_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: turtleprogrammer
--

ALTER SEQUENCE topic_edit_history_id_seq OWNED BY topic_edit_history.id;


--
-- Name: topic_history; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE topic_history (
    user_id integer NOT NULL,
    topic_id varchar(48) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    primary key (user_id, topic_id)
);


ALTER TABLE topic_history OWNER TO turtleprogrammer;

--
-- Name: topics; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE topics (
    id integer NOT NULL,
    slug character varying(256),
    title character varying(256) NOT NULL,
    version_number integer NOT NULL,
    markdown text NOT NULL,
    author_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    content_list jsonb DEFAULT '[]'::json
);


ALTER TABLE topics OWNER TO turtleprogrammer;

--
-- Name: topics_id_seq; Type: SEQUENCE; Schema: public; Owner: turtleprogrammer
--

CREATE SEQUENCE topics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE topics_id_seq OWNER TO turtleprogrammer;

--
-- Name: topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: turtleprogrammer
--

ALTER SEQUENCE topics_id_seq OWNED BY topics.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: turtleprogrammer
--

CREATE TABLE users (
    id integer NOT NULL,
    email character varying(256) NOT NULL,
    name character varying(256),
    avatar character varying(256),
    active boolean,
    superuser boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE users OWNER TO turtleprogrammer;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: turtleprogrammer
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO turtleprogrammer;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: turtleprogrammer
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: topic_edit_history id; Type: DEFAULT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topic_edit_history ALTER COLUMN id SET DEFAULT nextval('topic_edit_history_id_seq'::regclass);


--
-- Name: topics id; Type: DEFAULT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topics ALTER COLUMN id SET DEFAULT nextval('topics_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: exercise_history exercise_history_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY exercise_history
    ADD CONSTRAINT exercise_history_pkey PRIMARY KEY (user_id, exercise_id);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (uuid);


--
-- Name: quizes quizes_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY quizes
    ADD CONSTRAINT quizes_pkey PRIMARY KEY (uuid);


--
-- Name: toc toc_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY toc
    ADD CONSTRAINT toc_pkey PRIMARY KEY (slug);


--
-- Name: topic_drafts topic_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topic_drafts
    ADD CONSTRAINT topic_drafts_pkey PRIMARY KEY (topic_id, author_id);


--
-- Name: topic_history topic_history_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topic_history
    ADD CONSTRAINT topic_history_pkey PRIMARY KEY (user_id, topic_id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: topics topics_slug_key; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topics
    ADD CONSTRAINT topics_slug_key UNIQUE (slug);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: topic_drafts topic_drafts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topic_drafts
    ADD CONSTRAINT topic_drafts_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id);


--
-- Name: topic_drafts topic_drafts_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topic_drafts
    ADD CONSTRAINT topic_drafts_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id);


--
-- Name: topics topics_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: turtleprogrammer
--

ALTER TABLE ONLY topics
    ADD CONSTRAINT topics_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id);


--
-- PostgreSQL database dump complete
--

