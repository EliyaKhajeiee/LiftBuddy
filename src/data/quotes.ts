export interface Quote {
  text:   string;
  author: string;
}

const QUOTES: Quote[] = [
  // Muhammad Ali
  { text: "Champions aren't made in gyms. Champions are made from something they have deep inside them — a desire, a dream, a vision.", author: "Muhammad Ali" },
  { text: "I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
  { text: "Float like a butterfly, sting like a bee. The hands can't hit what the eyes can't see.", author: "Muhammad Ali" },
  { text: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali" },
  { text: "I am the greatest. I said that even before I knew I was.", author: "Muhammad Ali" },
  { text: "It's not bragging if you can back it up.", author: "Muhammad Ali" },
  { text: "The man who has no imagination has no wings.", author: "Muhammad Ali" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },

  // Mike Tyson
  { text: "Everybody has a plan until they get punched in the mouth.", author: "Mike Tyson" },
  { text: "Discipline is doing what you hate to do, but nonetheless doing it like you love it.", author: "Mike Tyson" },
  { text: "I'm the best ever. I'm the most brutal and vicious champion there has ever been.", author: "Mike Tyson" },
  { text: "My power is discomfort with the status quo.", author: "Mike Tyson" },
  { text: "Anyone can get knocked down. What matters is whether you get back up.", author: "Mike Tyson" },

  // Kobe Bryant
  { text: "The moment you give up is the moment you let someone else win.", author: "Kobe Bryant" },
  { text: "I can't relate to lazy people. We don't speak the same language.", author: "Kobe Bryant" },
  { text: "Everything negative — pressure, challenges — is all an opportunity for me to rise.", author: "Kobe Bryant" },
  { text: "Winning takes precedence over all. There's no gray area. No almosts.", author: "Kobe Bryant" },
  { text: "Hard work outweighs talent — every time.", author: "Kobe Bryant" },
  { text: "The most important thing is to try and inspire people so that they can be great in whatever they want to do.", author: "Kobe Bryant" },
  { text: "Once you know what failure feels like, determination chases success.", author: "Kobe Bryant" },
  { text: "Dedication sees dreams come true.", author: "Kobe Bryant" },

  // Michael Jordan
  { text: "I've missed more than 9,000 shots. I've lost almost 300 games. I've failed over and over again. And that is why I succeed.", author: "Michael Jordan" },
  { text: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan" },
  { text: "If you're trying to achieve, there will be roadblocks. But obstacles don't have to stop you.", author: "Michael Jordan" },
  { text: "Limits, like fears, are often just an illusion.", author: "Michael Jordan" },
  { text: "I play to win, whether during practice or a real game.", author: "Michael Jordan" },
  { text: "My attitude is that if you push me towards something that you think is a weakness, then I will turn that perceived weakness into a strength.", author: "Michael Jordan" },
  { text: "Talent wins games, but teamwork and intelligence win championships.", author: "Michael Jordan" },

  // David Goggins
  { text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.", author: "David Goggins" },
  { text: "The most important conversation is the one you have with yourself.", author: "David Goggins" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "No one is going to come help you. No one's coming to save you.", author: "David Goggins" },
  { text: "I'm not afraid of suffering. I use it as fuel.", author: "David Goggins" },
  { text: "You have to build calluses on your brain just like on your hands.", author: "David Goggins" },
  { text: "When you think you're done, you're only at 40% of your capacity.", author: "David Goggins" },

  // Arnold Schwarzenegger
  { text: "The mind is the limit. As long as the mind can envision you doing something, you can do it.", author: "Arnold Schwarzenegger" },
  { text: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
  { text: "The worst thing I can be is the same as everybody else.", author: "Arnold Schwarzenegger" },
  { text: "You can have results or excuses. Not both.", author: "Arnold Schwarzenegger" },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
  { text: "Reps, reps, reps. That's the only way to get better.", author: "Arnold Schwarzenegger" },

  // Jocko Willink
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Don't count on motivation. Count on discipline.", author: "Jocko Willink" },
  { text: "Prioritize and execute. Remain calm, be decisive.", author: "Jocko Willink" },
  { text: "Extreme ownership means no excuses.", author: "Jocko Willink" },
  { text: "The best thing you can do is wake up early and attack the day.", author: "Jocko Willink" },

  // Conor McGregor
  { text: "There's no talent here. This is hard work. This is an obsession.", author: "Conor McGregor" },
  { text: "Doubt is only removed by action. If you're not working, doubt creeps in.", author: "Conor McGregor" },
  { text: "I visualized where I wanted to be, what kind of player I wanted to become. I knew exactly where I wanted to go.", author: "Conor McGregor" },
  { text: "We're not just dreamers. We're doers.", author: "Conor McGregor" },

  // Dwayne Johnson
  { text: "Be the hardest worker in the room.", author: "Dwayne Johnson" },
  { text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson" },
  { text: "I like to use the hard times of the past to motivate myself today.", author: "Dwayne Johnson" },
  { text: "Think back 5 years ago. Think of where you are today. Think ahead 5 years and what you want to accomplish. Be unstoppable.", author: "Dwayne Johnson" },

  // LeBron James
  { text: "Don't be afraid of failure. This is the way to succeed.", author: "LeBron James" },
  { text: "I like criticism. It makes you strong.", author: "LeBron James" },
  { text: "I'm going to use all my tools, my God-given ability, and make the best life I can with it.", author: "LeBron James" },
  { text: "You have to be able to accept failure to get better.", author: "LeBron James" },

  // Tom Brady
  { text: "Do your job. Nothing more, nothing less.", author: "Tom Brady" },
  { text: "I want to be the best, so I work my hardest.", author: "Tom Brady" },
  { text: "If you don't play to win, don't play at all.", author: "Tom Brady" },
  { text: "A lot of people don't want to make their own decisions. They're too scared. It's easier to be told what to do.", author: "Tom Brady" },

  // Serena Williams
  { text: "I really think a champion is defined not by their wins but by how they recover when they fall.", author: "Serena Williams" },
  { text: "I've grown most not from victories, but setbacks.", author: "Serena Williams" },
  { text: "Every loss is a lesson. Every win is a lesson.", author: "Serena Williams" },
  { text: "You have to believe in yourself when no one else does.", author: "Serena Williams" },

  // Eric Thomas
  { text: "When you want to succeed as bad as you want to breathe, then you'll be successful.", author: "Eric Thomas" },
  { text: "I do what others won't, so I can do what others can't.", author: "Eric Thomas" },
  { text: "Stop being average. You're not average.", author: "Eric Thomas" },
  { text: "Pain is temporary. It may last for a minute, an hour, a day, or even a year, but eventually it will subside and something else will take its place.", author: "Eric Thomas" },

  // Tony Robbins
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "It's not what we do once in a while that shapes our lives. It's what we do consistently.", author: "Tony Robbins" },
  { text: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins" },
  { text: "In life you need either inspiration or desperation.", author: "Tony Robbins" },

  // Usain Bolt
  { text: "I trained 4 years to run 9 seconds. People give up when they don't see results in 2 months.", author: "Usain Bolt" },
  { text: "I know what I can do, so I never doubt myself.", author: "Usain Bolt" },
  { text: "Easy is not an option. No days off. Never quit.", author: "Usain Bolt" },

  // Vince Lombardi
  { text: "Winners never quit and quitters never win.", author: "Vince Lombardi" },
  { text: "The price of success is hard work, dedication, and the determination that whether we win or lose, we have applied the best of ourselves to the task.", author: "Vince Lombardi" },
  { text: "It's not whether you get knocked down — it's whether you get up.", author: "Vince Lombardi" },
  { text: "Once you learn to quit, it becomes a habit.", author: "Vince Lombardi" },

  // Michael Phelps
  { text: "If you want to be the best, you have to do things other people aren't willing to do.", author: "Michael Phelps" },
  { text: "There will be obstacles. There will be doubters. There will be mistakes. But with hard work, there are no limits.", author: "Michael Phelps" },

  // Cristiano Ronaldo
  { text: "Your love for what you do and willingness to push yourself where others aren't prepared to go is what will make you great.", author: "Cristiano Ronaldo" },
  { text: "Talent without working hard is nothing.", author: "Cristiano Ronaldo" },
  { text: "I don't have time to be complacent. Champions never stand still.", author: "Cristiano Ronaldo" },

  // George Foreman
  { text: "The question isn't whether you can do it. It's whether you will.", author: "George Foreman" },
  { text: "A champion is someone who gets up when he can't.", author: "George Foreman" },

  // Joe Frazier
  { text: "You can map out a fight plan or a life plan. But when the action starts, you're down to your reflexes.", author: "Joe Frazier" },
  { text: "If you don't put the work in, you'll be knocked down every time.", author: "Joe Frazier" },

  // Marcus Aurelius
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "The secret of all victory lies in the organization of the non-obvious.", author: "Marcus Aurelius" },

  // Rocky Balboa
  { text: "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", author: "Rocky Balboa" },
  { text: "Every champion was once a contender who refused to give up.", author: "Rocky Balboa" },
  { text: "Going in one more round when you don't think you can — that's what makes all the difference in your life.", author: "Rocky Balboa" },

  // Floyd Mayweather
  { text: "Hard work. Dedication.", author: "Floyd Mayweather" },
  { text: "My whole life is dedicated to my craft. I eat, sleep, and breathe it.", author: "Floyd Mayweather" },

  // Winston Churchill
  { text: "Success is not final. Failure is not fatal. It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Never, never, never give up.", author: "Winston Churchill" },

  // Manny Pacquiao
  { text: "The true test of a champion is not whether he can triumph, but whether he can overcome obstacles — and rise above defeat.", author: "Manny Pacquiao" },

  // Khabib Nurmagomedov
  { text: "Train, don't talk.", author: "Khabib Nurmagomedov" },
  { text: "I don't have to prove anything to anybody. My results speak for themselves.", author: "Khabib Nurmagomedov" },
];

export function getDailyQuote(): Quote {
  const now      = new Date();
  const start    = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export default QUOTES;
