export interface AthleteQuote {
  text:   string;
  author: string;
}

// Keyed by the day's splitKey field
export const MUSCLE_QUOTES: Record<string, AthleteQuote[]> = {

  legs: [
    { text: "When it starts to hurt, that's when the set begins. The pain is telling you something important — listen to it and push through.", author: "Tom Platz" },
    { text: "The legs are the foundation of the body. Neglect them and your whole structure is weak.", author: "Tom Platz" },
    { text: "People always say my legs are a gift. No. I earned every centimeter of them with blood and obsession.", author: "Tom Platz" },
    { text: "Your legs can sustain whatever your mind demands of them. The weakness is never in the muscle.", author: "Tom Platz" },
    { text: "There are no shortcuts to leg development. Just iron, pain, and time.", author: "Tom Platz" },
    { text: "I never left the squat rack until my legs were completely destroyed. That's the only way.", author: "Tom Platz" },
    { text: "Leg day separates the serious from the recreational. Which one are you?", author: "Tom Platz" },
    { text: "Every rep on the squat is a negotiation between who you are and who you want to be.", author: "Tom Platz" },
  ],

  chest: [
    { text: "The last three or four reps is what makes the muscle grow. This area of pain divides the champion from someone who is not a champion.", author: "Arnold Schwarzenegger" },
    { text: "Reps, reps, reps. That's the only way to get better at anything. You put in the work.", author: "Arnold Schwarzenegger" },
    { text: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
    { text: "I love the feeling of being in the gym, lifting heavy and knowing I'm building something.", author: "Arnold Schwarzenegger" },
    { text: "Bodybuilding is much like any other sport. To be successful, you must dedicate yourself 100% to your training, diet and mental approach.", author: "Arnold Schwarzenegger" },
    { text: "The worst thing I can be is the same as everybody else. I hate that.", author: "Arnold Schwarzenegger" },
    { text: "You have to remember something: Everybody pities the weak; jealousy you have to earn.", author: "Arnold Schwarzenegger" },
  ],

  push: [
    { text: "The last three or four reps is what makes the muscle grow. This area of pain divides the champion from someone who is not a champion.", author: "Arnold Schwarzenegger" },
    { text: "Strength does not come from winning. Your struggles develop your strengths. When you go through hardships and decide not to surrender, that is strength.", author: "Arnold Schwarzenegger" },
    { text: "I love the feeling of the fresh air on my face and the wind blowing through my hair after I've been in the gym.", author: "Arnold Schwarzenegger" },
    { text: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
    { text: "You can have results or excuses. Not both.", author: "Arnold Schwarzenegger" },
    { text: "If it doesn't challenge you, it doesn't change you.", author: "Arnold Schwarzenegger" },
  ],

  back: [
    { text: "The most dangerous phrase you can use is 'I've always done it this way.' Apply that to training and your progress will flatline.", author: "Dorian Yates" },
    { text: "Most people who train hard still aren't training hard enough. Intensity is everything.", author: "Dorian Yates" },
    { text: "Blood and guts. That's what built the back I have. No secrets, no shortcuts.", author: "Dorian Yates" },
    { text: "A few hard sets done properly will outperform twenty mediocre ones every time.", author: "Dorian Yates" },
    { text: "You don't build a great back by accident. It takes years of purposeful pain.", author: "Dorian Yates" },
    { text: "I approached my training like a job. Clock in, do the work, clock out. Consistency creates champions.", author: "Dorian Yates" },
    { text: "Every rep you do with perfect form is money in the bank. Every sloppy rep is a debt.", author: "Dorian Yates" },
  ],

  pull: [
    { text: "Most people who train hard still aren't training hard enough. Intensity is everything.", author: "Dorian Yates" },
    { text: "A few hard sets done properly will outperform twenty mediocre ones every time.", author: "Dorian Yates" },
    { text: "Blood and guts. That's what built the back I have. No secrets, no shortcuts.", author: "Dorian Yates" },
    { text: "I approached my training like a job. Clock in, do the work, clock out.", author: "Dorian Yates" },
    { text: "You have to be willing to suffer to be great. Not just willing — hungry for it.", author: "Dorian Yates" },
  ],

  arms: [
    { text: "Big arms don't come from half-hearted efforts. They come from going to failure every single set.", author: "Lee Priest" },
    { text: "I never left a session with anything left in the tank. When the arms are blown out, then you're done.", author: "Lee Priest" },
    { text: "You want arms that turn heads? Then you have to work on them like they're the only thing that matters.", author: "Lee Priest" },
    { text: "Detail comes from obsession. You can't fake it in the gym or on stage.", author: "Lee Priest" },
    { text: "Every curl, every press — done with full intention and maximum contraction. That's how arms get built.", author: "Lee Priest" },
    { text: "The guys with the best arms aren't doing anything fancy. They're doing the basics, heavier and harder than you.", author: "Lee Priest" },
  ],

  shoulders: [
    { text: "A muscle must be fully worked, fully stretched, and fully contracted. Nothing less.", author: "Mike Mentzer" },
    { text: "High intensity is the only route to extraordinary development. Everything else is maintenance.", author: "Mike Mentzer" },
    { text: "Train less, but train with everything you have. Quality always wins over quantity.", author: "Mike Mentzer" },
    { text: "The shoulders are the frame of the body. Build them wide and everything else looks better.", author: "Mike Mentzer" },
    { text: "You don't need more volume. You need more intensity in the volume you have.", author: "Mike Mentzer" },
  ],

  full_body: [
    { text: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: "Ronnie Coleman" },
    { text: "Ain't nothing but a peanut. Light weight, baby!", author: "Ronnie Coleman" },
    { text: "Yeah buddy! That's what it's all about — putting in the work every single day.", author: "Ronnie Coleman" },
    { text: "I don't stop when I'm tired. I stop when I'm done. And I'm never done.", author: "Ronnie Coleman" },
    { text: "The day you stop pushing is the day you start going backwards.", author: "Ronnie Coleman" },
    { text: "Believe in yourself, work your ass off, and good things will happen.", author: "Ronnie Coleman" },
    { text: "Everybody can improve. But not everybody wants to pay the price.", author: "Ronnie Coleman" },
  ],

  upper: [
    { text: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
    { text: "The most common mistake made in the gym is underestimating the importance of training intensity.", author: "Dorian Yates" },
    { text: "Big arms don't come from half-hearted efforts.", author: "Lee Priest" },
  ],

  lower: [
    { text: "The legs are the foundation of the body. Neglect them and your whole structure is weak.", author: "Tom Platz" },
    { text: "Your legs can sustain whatever your mind demands of them. The weakness is never in the muscle.", author: "Tom Platz" },
    { text: "Leg day separates the serious from the recreational. Which one are you?", author: "Tom Platz" },
  ],

  rest: [
    { text: "Rest is not quitting. It's part of the program.", author: "Ronnie Coleman" },
    { text: "Recovery is where growth actually happens. Honor it.", author: "Dorian Yates" },
    { text: "Your muscles grow when you sleep, not when you lift.", author: "Arnold Schwarzenegger" },
    { text: "A champion is defined by what he does on his off days too.", author: "Mike Mentzer" },
  ],
};

export function getDayQuote(splitKey: string): AthleteQuote {
  const list = MUSCLE_QUOTES[splitKey] ?? MUSCLE_QUOTES.full_body;
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return list[dayOfYear % list.length];
}
