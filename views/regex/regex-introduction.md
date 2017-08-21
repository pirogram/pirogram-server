
# Regex - Introduction
Regular expressions are a powerful way to find patterns in text. Once you find a pattern, you can also extract the matching portion of the text or you can replace it with some other text. They are implemented in the `re` module of `Python`. Here is a quick example where we check if a movie name has `War` in the name or not.

```Python
>>> import re
>>>
>>> name = "Star Wars: The Last Jedi"
>>> re.search(r"War", name)
<_sre.SRE_Match object; span=(5, 8), match='War'>
>>> 
>>> name = "Star Trek: Discovery"
>>> re.search(r"War", name)
>>> 
```

The pattern we are looking for is `"War"` and it is (optionally) prefixed with `r` to indicate that it’s a regular expression. When we search for this pattern in the name `"Star Wars: The Last Jedi"`, we find a match that spans index 5 to index 8. When we search for this pattern in name `"Star Trek: Discovery"`, we don’t find a match.

Here is a quick example to search for this pattern in a list of names.

```Python
# From the given list of names, select the ones that have War.
import re
movies = [
		"Star Wars: The Last Jedi",
		"Star Wars: The Force Awakens",
		"Star Trek: Discovery",
		"Star Trek: Voyager",
		"2001: A Space Odyssey",
		"Star Dust"
]
selected_movies = [movie for movie in movies if re.search(r"War", movie) != None]
print(selected_movies)
```

Regular expressions are described using a formal language that provides us with grammar to say things like:

- which characters are allowed and which ones are not.
- how do the allowed characters repeat (e.g. if you are searching for year, digits 0-9 repeat 4 times).
- how does the pattern align with boundaries of line or word (e.g. match the lines that begin with word *The*).
- many more things as we’ll see going forward.

