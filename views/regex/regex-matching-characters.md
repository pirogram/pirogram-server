
# Regex - Matching Characters
First, we are going to see how to search for specific characters.

## Matching Literals
Previously, we searched for a specific sequence of characters (`War`) in movie names. This is not very powerful since you could even use simple functions like `find()` for this purpose. But this is just a start to the subject.

Before we explore other ways to search for specific characters (and character sequences), let's ensure that we have learnt how to search for literals.

--mcquiz
Here are some movie names. Which of these would match the regex `r"Window"`:
  [#] Rear Window
  [#] Secret Window
  [#] Open Windows
  [ ] Win it All
  [ ] Gone With The Wind
--

--regexquiz
What's the regex to select movies from Star Wars franchise?
  [#] Star Wars: The Last Jedi
  [#] Star Wars: The Force Awakens
  [ ] Star Trek: Discovery
  [ ] Star Trek: Voyager
  [ ] 2001: A Space Odyssey
--

### Searching for multiple options (match either star wars or star trek)
What if we want to change the previous exercise and we would now like to select movies from two franchises: Star Wars and Star Trek. How do we do that?

Regex have an or operator (`|`). For example: `r"win|lose"` will match the text which has `win` or `lose` in it.

```
>>> import re
>>> 
>>> re.search(r"win|lose", "I am gonna win.")
<_sre.SRE_Match object; span=(11, 14), match='win'>
>>>
>>> re.search(r"win|lose", "You are gonna lose.")
<_sre.SRE_Match object; span=(14, 18), match='lose'>
>>>
>>> re.search(r"win|lose", "I am gonna win. You are gonna lose.")
<_sre.SRE_Match object; span=(11, 14), match='win'>
>>>
>>> re.search(r"win|lose", "It's going to rain today.")
>>>
```

First we searched for this pattern in `"I am gonna win."` and found a match (from index 11 to 14). Then we searched in `"You are gonna lose."` and again found a match (from index 14 to 18). Next we searched in `"I am gonna win. You are gonna lose."`. Even though there are two matches, regex stops after finding the first one (from index 11 to 14). Next statement `"It's going to rain today."` did not find a match.

--mcquiz
Here are some movie names. Which of these would match the regex `r"Force|Jedi"`:
  [#] Star Wars: The Last Jedi
  [#] Star Wars: The Force Awakens
  [ ] Star Trek: Discovery
  [ ] Star Trek: Voyager
--

--regexquiz
What's the regex to select movies from Star Wars as well as Star Trek franchise?
  [#] Star Wars: The Last Jedi
  [#] Star Wars: The Force Awakens
  [#] Star Trek: Discovery
  [#] Star Trek: Voyager
  [ ] 2001: A Space Odyssey
  [ ] Star Dust
--

While you could write the expression for previous exercise as `r"Star Wars|Star Trek"`, you could also be more concise by saying `r"Star (Wars|Trek)"`. The round braces (`()`) is a way to group choices related to a sub-pattern.

--mcquiz
From a list of movies, if we want to match the ones that are part of `Superman` or `Supergirl` franchise, which of the following regex would do the work:
  [#] `r"Superman|Supergirl"`
  [#] `r"Super(man|girl)"`
  [ ] `r"Super(m|g)(a|i)(n|r)l"`
  [#] `r"Super(m|g)(a|i)(n|rl)"`
  [#] `r"Super((man|girl))"`
  [#] `r"Super((man)|girl)"`
--

## Searching for special characters
As you can see, some of the characters have a special meaning in regex (e.g. `|`). If you want to match those characters, you need to prefix them with `\\` which is called escape character.

So, if you want to match `A|B`, your regex would be `r"A\|B"`.

--regexquiz
Find movie names that use a question mark i.e. `?`. Note that ? is a special character in regex and must be escaped.
  [#] Why Me?
  [#] Mad Monster Party?
  [ ] Superman
--

### Searching for a range of characters
An interesting problem to solve is to find out movies that mention a year in their name. Sample movie names are: `2001: A Space Odyssey`, `Dream Team 1935`, `Class of 1999` etc. We can construct a pattern like `r"(1|2)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)"`. Let’s see if it works:

```Python
>>> import re
>>>
>>> re.search(r"(1|2)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)", "2001: A Space Odyssey")
<_sre.SRE_Match object; span=(0, 4), match='2001'>
>>>
>>> re.search(r"(1|2)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)", "Superman")
>>> 
```

It works. When we search for this pattern in movie `2001: A Space Odyssey`, we get a match from index 0 to 4. But when we search against `Superman`, we don’t get a match.

There is a short cut for this kind of pattern. `r"[0123456789]"` is equivalent to `r"(0|1|2|3|4|5|6|7|8|9)"`. So, we can re-write the previous expression as `r"[12][0123456789][0123456789][0123456789]` and this would match numbers from `0000` all the way to `2999`. Let’s re-work the previous examples using the new format:

```Python
>>> import re
>>>
>>> re.search(r"[12][0123456789][0123456789][0123456789], "2001: A Space Odyssey")
<_sre.SRE_Match object; span=(0, 4), match='2001'>
>>>
>>> re.search(r"[12][0123456789][0123456789][0123456789], "Superman")
>>> 
```

In fact, such needs are so common that there is a further shortcut to matching digits 0-9: `r"[0-9]"`. So, we can once again re-write the expression as `r"[12][0-9][0-9][0-9]"`.

--regexquiz
Try different regex variations that we discussed just now to select movie names that have a year in their name.
  [#] 2001: A Space Odyssey",
  [#] Amityville 1992: It's About Time",
  [#] 1984",
  [ ] Gone With The Wind",
  [ ] Star Wars: The Last Jedi"
--

Ranges work not only for digits but also for alphabets. So, you could say `r"[A-Z]"` to match any upper case letter, `r"[a-z]"` to match any lower case letter, `r"[A-Za-z]"` to match all English alphabet letters, `r"[A-Za-z0-9]"` to match any alphanumeric characters. In fact, you can also say `r"[AM-PZ]"` and it would match letters A, M, N, O, P, Z.

```Python
>>> import re
>>> 
>>> re.search(r"[A-Z]", "2001: A Space Odyssey")
<_sre.SRE_Match object; span=(6, 7), match='A'>
>>> 
>>> re.search(r"[A-Z]", "1984")
>>>
```

Here, we are looking for a movie name with an uppercase letter. The movie `2001: A Space Odyssey` is a match, whereas, the movie `1984` is not a match.

--mcquiz
Here are some movie names. Which ones would match the regex `r"[0-9][0-9][0-9][0-9]:"`
  [#] 2001: A Space Odyssey
  [#] Amityville 1992: It's About Time
  [#] Detroit 9000
  [#] 2010: The Year We Make Contact
  [#] Godzilla 2000
--

--mcquiz
From a list of movies, if we want to match the ones that are part of `Superman` or `Supergirl` franchise, which of the following regex would do the work:
  [ ] `r"Super[mg][ai][nrl]"`
  [#] `r"Super[mg][ai][nr]l"`
  [#] `r"Super[mg][ai](n|rl)"`
  [ ] `r"Super[mangirl]"`
--

--regexquiz
Here is a list of movie names. Select the ones that have at least one 4 letter word in the middle of movie name.
  [#] Gone With The Wind
  [#] Star Wars: The Last Jedi
  [#] 2010: the year we make contact
  [#] Superman
--

--regexquiz
Here is a list of movie names. Select the ones that use a number within a word.
  [#] Se7en
  [#] Thr3e
  [ ] E=mc2
  [ ] 2001: A Space Odyssey
  [#] Superman
--

--regexquiz
Here is a list of movie names. Select the ones that have a bat, cat or rat in the name. Use the shortest possible regex.
  [#] Bat Whispers
  [#] Cat and Dog
  [#] King Rat
  [ ] The Ghosts
--


### Matching absence of characters
Just like you can match for presence of certain characters, you can also match for their absence. `r"[^A-Z]"` will match all characters except uppercase letters. `r"[^BCR]at"` will match `Sat` but it will not match `Bat`, `Cat` and `Rat`. Simple trick here is to use `^`. `[BCR]` means match B, C or R but `[^BCR]` means match anything other than B, C or R.

--mcquiz
Which of the following match regex `r"[0-1][0-9]:[0-6][0-9] [^P]M"`:
  [#] 04:00 AM
  [#] 11:59 AM
  [ ] 06:00 PM
  [ ] 09:23 PM
--

### Searching for types of characters
Some of the character ranges are so commonly used that there are further shortcuts for them. Here is the list:
- `\w` is equivalent to `[A-Za-z0-9_]`
- `\W` is opposite of `\w` i.e. `[^A-Za-z0-9_]`
- `\s` is equivalent to `[ \t\r\n]`
- `\S` is opposite of `\s` i.e. `[^ \t\r\n]`
- `\d` is equivalent to `[0-9]`
- `\D` is opposite of `\d` i.e. `[^0-9]`
- `.` is the most interesting shortcut and it matches all characters without exception.

Let’s look at some examples.

**Example 1:** Expression `r"\w\w\w\w\w"` will match a word that has at least 5 characters from the set `[A-Za-z0-9_]`.

```Python
>>> re.search(r"\w\w\w\w\w", "The Ghosts")
<_sre.SRE_Match object; span=(4, 9), match='Ghost'>
>>> re.search(r"\w\w\w\w\w", "Cat And Dog")
>>>
```

We found a match in first movie `The Ghosts` but no in second one `Cat And Dog`.

**Example 2:** Expression `r"\d\d\d\d"` will match a movie a year in its name.

```Python
>>> re.search(r"\d\d\d\d", "2001: A Space Odyssey")
<_sre.SRE_Match object; span=(0, 4), match='2001'>
>>> re.search(r"\d\d\d\d", "The Ghosts")
>>>
```

We found a match in the first movie `2001: A Space Odyssey` but not in the second one `The Ghosts`.

**Example 3:** Expression `r"\w\w\w\w\s\w\w\w\w"` would match a movie name that has at least two words and both the words have at least 4 letters.

```Python
>>> re.search(r"\w\w\w\w\s\w\w\w\w", "Gone With The Wind")
<_sre.SRE_Match object; span=(0, 9), match='Gone With'>
>>> 
>>> re.search(r"\w\w\w\w\s\w\w\w\w", "The Ghosts")
>>> 
>>> re.search(r"\w\w\w\w\s\w\w\w\w", "Cat And Dog")
>>>
```

In this case, first movie matches but the other two don’t.

**Example 4:** Expression `r"......"` will match any movie name which is at least 6 character long.

```Python
>>> re.search(r"......", "The Ghosts")
<_sre.SRE_Match object; span=(0, 6), match='The Gh'>
>>> 
>>> re.search(r"......", "1984")
>>> 
```


--regexquiz
Find movies with at least 8 characters in their name.
  [ ] Se7en
  [ ] Thr3e
  [ ] E=mc2
  [#] 2001: A Space Odyssey
  [#] Superman
--

--regexquiz
Find movies with at least one 4 letter word followed by at least 3 letter word.
  [ ] Bat Whispers
  [ ] Cat and Dog
  [#] King Rat
  [ ] The Ghosts
--

--regexquiz
Find movies which have a number surrounded by two letters on each side.
  [#] Se7en
  [ ] Thr3e
  [ ] E=mc2
  [ ] 2001: A Space Odyssey
  [ ] Superman
--

