
# Regex - Matching Repetitions
There are some special symbols that can be used to denote how a specific pattern repeats. We’ll see what it means as we move forward.

## Matching 0 or 1 occurrences using ?
Let’s say, you are writing a regex to match numbers 1 to 9. You can easily do it with `r"\d"`. If you are matching numbers 10 to 99, you can use `r"\d\d"`. However, what do you do if you want to match numbers 1 to 99? You can do it with `r"\d?\d"`. `\d?` means that this `\d` is optional.

```Python
>>> re.search("\d?\d", "43")
<_sre.SRE_Match object; span=(0, 2), match='43'>
>>> re.search("\d?\d", "4")
<_sre.SRE_Match object; span=(0, 1), match='4'>
```

Note: the pattern `r"\d?\d"` would always try to look for two digits as a first thing. However, if it doesn’t find two, it would settle for one. That’s different from `r"\d"` which would always try to match one digit.

--mcquiz
Which of the following would match regex `r"[+-]\d?\d"`
  [#] +40
  [#] -2
  [#] +324
  [ ] 22
--

--regexquiz
Write a regex that would match numbers -99 to 99. So, it should match -99, -98, …, 98, 99.
  [#] -73
  [#] 4
  [#] 33
  [ ] +42
  [ ] AB
  [ ] def
--

--regexquiz
Write a regex that would match numbers -99 to 99. The +ve numbers may be written with or without a `+` prefix. For example, 98 could be written as 98 or +98.  
  [#] -73
  [#] 4
  [#] 33
  [#] +42
  [ ] AB
  [ ] def
--

## Matching 0 or more occurrences using *
Just like `?` matches something that’s optional, `*` matches something that’s optional and yet it can have more than 1 occurrences. So, `r"BA*T"` will match `"BT"`, `"BAT"` as well as `"BAAAAAAAAT"`.

```Python
>>> re.search( "BA*T", "BT")
<_sre.SRE_Match object; span=(0, 2), match='BT'>
>>> re.search( "BA*T", "BAT")
<_sre.SRE_Match object; span=(0, 3), match='BAT'>
>>> re.search( "BA*T", "BAAAAAT")
<_sre.SRE_Match object; span=(0, 7), match='BAAAAAT'>
```

--mcquiz
Which of the following would match regex `r"\w\s*:\s*\w"`:
  [#] Potatoes: 4
  [#] Potatoes:4
  [#] Potatoes    :     4
  [#] 4: Potatoes
  [ ] Potatoes :: 4
  [ ] :Potatoes:
--

--regexquiz
Write a regex that would match the sentences that mention cat followed by dog. Hint: use repetition of `.` to match word & space characters.
  [#] The cat chased the dog.
  [#] The cat ran away from the dog.
  [ ] The dog looked at the cat with confusion.
  [ ] The dog was friendly to the cat.
  [ ] The cat drank milk.
--

--regexquiz
Write a regex that would match sentences that mention cat and dog in any order (i.e. word cat could come before or after the word dog). Hint: Use the `|` operator.
  [#] The cat chased the dog.
  [#] The cat ran away from the dog.
  [#] The dog looked at the cat with confusion.
  [#] The dog was friendly to the cat.
  [ ] The cat drank milk.
  [ ] The dog went wild.
--

## Matching 1 or more occurrences using +
Just like `*` matches 0 or more occurrences, `+` matches 1 or more occurrences. That means the preceding pattern is not optional. There has to be at least one instance but it can repeat any number of times. Where is it useful? Let’s say we want to match `Yikes` as well as `Yiiiiiiiikkkkkes` in our text. They eventually mean the same thing with different intensity. We could do something like this:

```Python
>>> re.search( "Yi+k+es", "Yikes" )
<_sre.SRE_Match object; span=(0, 5), match='Yikes'>
>>> re.search( "Yi+k+es", "Yiiiiiiiiikkkkkes" )
<_sre.SRE_Match object; span=(0, 17), match='Yiiiiiiiiikkkkkes'>
```

How do you find out the names of movies that have at least 2 words? Something along the lines of `r"\w+\s+\w+"` would do the trick.

--regexquiz
Write a regex to match movies with at least three words in their name.
  [#] Gone With The Wind
  [ ] Superman
  [#] La La Land
  [#] The Sixth Sense
  [ ] Braveheart
--

--regexquiz
Write a regex to match movies with at least four words in their name. Note: you have to match `:` as part of characters between words. Hint: you can use `[]` or `|` for matching characters between words.
  [#] Gone With The Wind
  [#] Star Wars: The Last Jedi
  [#] 2010: the year we make contact
  [ ] Superman
  [ ] Shawshank Redemption
  [#] 2001: A Space Odyssey
--

--regexquiz
Write a regex to match the sentences that mention two years.
  [#] 1984 comes before 1999.
  [#] 2004 comes after 2001.
  [ ] In 2015, I bought 2 cars.
  [ ] There was a flood in 1999.
--

## Matching m to n repetitions
Other than `?`, `*` and `+`, there is one more way to specify the number of repetitions that we want to match. `r"\d{m,n}"` means `\d` must repeat minimum `m` times and maximum `n` times. For example, `r"Yi{1,5}k{1,3}es"` will allow `i` to repeat 1-5 times and `k` to repeat 1-3 times.

```Python
>>> re.search( r"Yi{1,5}k{1,3}es", "Yikes" )
<_sre.SRE_Match object; span=(0, 5), match='Yikes'>
>>> re.search( r"Yi{1,5}k{1,3}es", "Yiiiiikkkes" )
<_sre.SRE_Match object; span=(0, 11), match='Yiiiiikkkes'>
>>> re.search( r"Yi{1,5}k{1,3}es", "Yiiiiiikkkes" )
>>> 
```

In this example, when there are 6 `i` in `Yiiiiiikkkes`, there is no match.

--mcquiz
Which of the following would match regex `r"[+-]\d{1,2}"`
  [#] +40
  [#] -2
  [#] +324
  [ ] 22
--

--regexquiz
Write a regex that would match numbers -999 to 999. So, it should match -999, -998, …, 998, 999. Use the `{m,n}` convention to specify repetitions.
  [#] -733
  [#] 4
  [#] 33
  [ ] +42
  [ ] AB
  [ ] def
--

--regexquiz
Find movies with at least 8 characters in their name. Hint: Use `[]` or `|` to mix word and space characters.
  [ ] Se7en
  [ ] Thr3e
  [ ] E=mc2
  [#] 2001: A Space Odyssey
  [#] Superman
--

A variation of `{m,n}` is `{m}` which means exactly `m` repetitions. So, `r"\d\d\d\d"` can be rewritten as `r"\d{4}"`.

--regexquiz
Write a regex that matches movies with a year in their name. Use the `{m}` convention.
  [#] 2001: A Space Odyssey
  [#] Amityville 1992: It's About Time
  [#] 1984
  [ ] Gone With The Wind
  [ ] Star Wars: The Last Jedi
--

--regexquiz
Find movies with at least one 4 letter word followed by at least 3 letter word.
  [ ] Bat Whispers
  [ ] Cat and Dog
  [#] King Rat
  [ ] The Ghosts
--

Final thing about the `{m,n}` directive is that `{m,}` means minimum `m` matches and maximum any number of matches. So, `{1,}` is equivalent to `+` and `{0,}` is equivalent to `*`.

Also, `{,n}` means minimum 0 to n repetitions.

--mcquiz
Which of the following are true:
  [#] `{0,1}` is same as `?`
  [ ] `{0,1}` is not same as `?`
  [#] `{,1}` is same as `?`
  [#] `{0,}` is same as `*`
  [ ] `{0,}` is not same as `*`
  [ ] `{,0}` is same as `*`
  [#] `{1,}` is same as `+`
  [ ] `{1,}` is not same as `+`
  [ ] `{,1}` is same as `+`
--